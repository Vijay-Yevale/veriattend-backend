const Session = require("../../models/attendancesession.model");
const Record = require("../../models/attendanceRecord.model");
const User = require("../../models/user.model");
const AppError = require("../../utils/AppError");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Class = require("../../models/class.model");
const {
  getActiveSlot,
  getActiveSlotByClass,
} = require("../timetable/timetable.service");

const {
  getCurrentDayAndTime,
  isTimeInSlot,
} = require("../timetable/timetable.helper");

const { getTodayRange } = require("../../utils/dateRange");
const { getIO } = require("../../socket/socket");
const faceService = require("../../modules/face/face.service"); 

// HELPER - DISTANCE CALCULATION

const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const toRad = (val) => (val * Math.PI) / 180;
  const R = 6371000; // meters

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// DYNAMIC QR (SOCKET-DRIVEN)

const QR_ROTATE_INTERVAL_MS = 6000; 

const QR_GRACE_PERIOD_MS = 3000;


const qrTimers = new Map();

const stopQrRotation = (sessionId) => {
  const key = sessionId.toString();
  const timer = qrTimers.get(key);

  if (timer) {
    clearInterval(timer);
    qrTimers.delete(key);
  }
};

const rotateQrOnce = async (sessionId) => {
  const session = await Session.findById(sessionId);

  if (!session || !session.isActive) {
    stopQrRotation(sessionId);
    return null;
  }

  if (Date.now() > session.expiresAt.getTime()) {
    stopQrRotation(sessionId);
    return null;
  }

  const now = Date.now();
  const qrToken = crypto.randomBytes(32).toString("hex");
  const qrExpiry = new Date(now + QR_ROTATE_INTERVAL_MS);

  const updated = await Session.findByIdAndUpdate(
    sessionId,
    {
      $set: {
        
        previousQrToken: session.qrToken,
        previousQrExpiry: new Date(now + QR_GRACE_PERIOD_MS),
        qrToken,
        qrExpiry,
      },
      $inc: { qrVersion: 1 },
    },
    { new: true }
  );

  try {
    getIO().to(`session:${sessionId}`).emit("QR_UPDATED", {
      sessionId: sessionId.toString(),
      qrToken: updated.qrToken,
      qrExpiry: updated.qrExpiry,
      qrVersion: updated.qrVersion,
    });
  } catch (err) {
    console.error("QR_UPDATED emit failed:", err.message);
  }

  return updated;
};

const startQrRotation = (sessionId) => {
  stopQrRotation(sessionId);

  const timer = setInterval(() => {
    rotateQrOnce(sessionId).catch((err) => {
      console.error("QR rotation failed:", err);
    });
  }, QR_ROTATE_INTERVAL_MS);

  qrTimers.set(sessionId.toString(), timer);
};


const resumeActiveSessionTimers = async () => {
  const activeSessions = await Session.find({ isActive: true }).select("_id expiresAt");
  const now = Date.now();

  for (const session of activeSessions) {
    if (session.expiresAt.getTime() > now) {
      startQrRotation(session._id);
    }
  }

  return { resumed: activeSessions.length };
};

// START SESSION

const startSession = async ({ teacherId, anchorLat, anchorLng }) => {
  const { startOfDay, endOfDay } = getTodayRange();
  const slot = await getActiveSlot(teacherId);

  if (!slot) {
    throw new AppError("No active lecture right now", 404);
  }


  const classId = slot.classInfo.classId;
  const subjectId = slot.subject.subjectId;
  const timetableSlotId = slot.timetableId;

  const qrToken = crypto.randomBytes(32).toString("hex");

  const existingSession = await Session.findOne({
    classId,
    subjectId,
    timetableSlotId,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  }).sort({ createdAt: -1 });

  if (existingSession?.isActive && existingSession.expiresAt > new Date()) {
    return existingSession;
  }

  let session;

  if (existingSession) {
    session = await Session.findByIdAndUpdate(
      existingSession._id,
      {
        $set: {
          isActive: true,
          teacherId, // re-stamp
          anchorLat,
          anchorLng,
          expiresAt: new Date(Date.now() + 2 * 60 * 1000),
          qrToken, // rotate the token so the old one is dead
          qrExpiry: new Date(Date.now() + QR_ROTATE_INTERVAL_MS),
          qrVersion: 1, // fresh start - reset the version counter
          previousQrToken: null, // don't let a QR from the last time this
          previousQrExpiry: null, // slot ran still be honored via grace period
        },
      },
      { new: true }
    );
  } else {
    session = await Session.create({
      teacherId,
      classId,
      subjectId,
      timetableSlotId,
      anchorLat,
      anchorLng,
      qrToken,
      qrExpiry: new Date(Date.now() + QR_ROTATE_INTERVAL_MS),
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
    });
  }

  startQrRotation(session._id);

  try {
    getIO().to(`session:${session._id}`).emit("SESSION_STARTED", {
      sessionId: session._id.toString(),
      qrToken: session.qrToken,
      qrExpiry: session.qrExpiry,
      qrVersion: session.qrVersion,
      expiresAt: session.expiresAt,
    });
  } catch (err) {
    console.error("SESSION_STARTED emit failed:", err.message);
  }

  return session;
};

// REFRESH QR (kept as a manual fallback if a client misses a socket push)

const refreshQr = async ({ sessionId }) => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new AppError("Session does not exist", 404);
  }

  if (!session.isActive) {
    throw new AppError("Session has ended", 400);
  }

  if (Date.now() > session.expiresAt.getTime()) {
    throw new AppError("Session has expired", 400);
  }

  if (Date.now() > session.qrExpiry.getTime()) {
    const updated = await rotateQrOnce(sessionId);
    return updated ? updated.qrToken : session.qrToken;
  }

  return session.qrToken;
};


// VERIFICATION TOKEN — the stage 1 → stage 2 handoff


const VERIFICATION_TOKEN_TTL_SECONDS = 3 * 60; 
const VERIFICATION_TOKEN_PURPOSE = "ATTENDANCE_FACE_VERIFICATION";
const VERIFICATION_TOKEN_SECRET =
  process.env.ATTENDANCE_VERIFICATION_SECRET || process.env.JWT_SECRET;

const issueVerificationToken = ({ sessionId, studentId, studentLat, studentLng, distance }) => {
  return jwt.sign(
    {
      purpose: VERIFICATION_TOKEN_PURPOSE,
      sessionId,
      studentId,
      studentLat,
      studentLng,
      distance,
    },
    VERIFICATION_TOKEN_SECRET,
    { expiresIn: VERIFICATION_TOKEN_TTL_SECONDS }
  );
};

const decodeVerificationToken = (token) => {
  if (!token) {
    throw new AppError("Verification token is required", 401);
  }

  let payload;

  try {
    payload = jwt.verify(token, VERIFICATION_TOKEN_SECRET);
  } catch (err) {
    console.log("FAILED -> Invalid/expired verification token:", err.message);
    throw new AppError(
      "Verification token is invalid or has expired, please scan the QR code again",
      401
    );
  }

  if (payload.purpose !== VERIFICATION_TOKEN_PURPOSE) {
    throw new AppError("Invalid verification token", 401);
  }

  return payload;
};

// SUBMIT ATTENDANCE — STAGE 1 (QR + GPS only)

const submitAttendance = async ({
  student,
  deviceId,
  studentLat,
  studentLng,
  qrToken,
}) => {
  console.log("========== SUBMIT ATTENDANCE (QR + GPS) ==========");
  console.log({
    studentId: student._id.toString(),
    classId: student.classId?.toString(),
    qrToken,
    deviceId,
    studentLat,
    studentLng,
  });


  const session = await Session.findOne({
    isActive: true,
    $or: [{ qrToken }, { previousQrToken: qrToken }],
  });

  if (!session) {
    console.log("FAILED -> Invalid QR");
    throw new AppError("Invalid QR code", 404);
  }

  const isPreviousToken = session.previousQrToken === qrToken;

  if (Date.now() > session.expiresAt.getTime()) {
    console.log("FAILED -> Session expired");
    throw new AppError("Session has expired", 400);
  }

  if (isPreviousToken) {

    if (!session.previousQrExpiry || Date.now() > session.previousQrExpiry.getTime()) {
      console.log("FAILED -> Previous QR grace period elapsed");
      throw new AppError("QR code has expired, scan the new one", 400);
    }
  } else if (Date.now() > session.qrExpiry.getTime()) {
    console.log("FAILED -> QR expired");
    throw new AppError("QR code has expired, scan the new one", 400);
  }

  if (
    !student.classId ||
    session.classId.toString() !== student.classId.toString()
  ) {
    console.log("FAILED -> Wrong class");
    throw new AppError("You do not belong to this class", 401);
  }


  const alreadyMarked = await Record.findOne({
    sessionId: session._id,
    studentId: student._id,
  });

  if (alreadyMarked) {
    console.log("FAILED -> Already marked");
    throw new AppError("Attendance already marked", 409);
  }

  if (!student.deviceId) {
    student.deviceId = deviceId;

    await User.findByIdAndUpdate(student._id, {
      $set: { deviceId },
    });
  } else if (student.deviceId !== deviceId) {
    console.log("FAILED -> Device mismatch");
    throw new AppError(
      "Another device is already bound to this account",
      400
    );
  }

  const distance = haversineDistance(
    session.anchorLat,
    session.anchorLng,
    studentLat,
    studentLng
  );

  if (distance > session.anchorRadius) {
    console.log("FAILED -> Outside classroom radius");
    throw new AppError("You are too far from the classroom", 400);
  }


  const verificationToken = issueVerificationToken({
    sessionId: session._id.toString(),
    studentId: student._id.toString(),
    studentLat,
    studentLng,
    distance,
  });

  console.log("========== SUBMIT SUCCESS (awaiting face verification) ==========");

  return {
    sessionId: session._id,
    verified: true,
    distance,
    verificationToken,
    expiresIn: VERIFICATION_TOKEN_TTL_SECONDS,
  };
};

// VERIFY FACE + MARK ATTENDANCE — STAGE 2

const verifyFaceAndMarkAttendance = async ({ student, verificationToken, embedding }) => {
  console.log("========== VERIFY FACE + MARK ATTENDANCE ==========");

  const payload = decodeVerificationToken(verificationToken);

  if (payload.studentId !== student._id.toString()) {
    console.log("FAILED -> Verification token does not belong to this student");
    throw new AppError("Verification token does not belong to this account", 403);
  }

  const session = await Session.findById(payload.sessionId);

  if (!session) {
    console.log("FAILED -> Session no longer exists");
    throw new AppError("Session no longer exists", 404);
  }

  if (!session.isActive) {
    console.log("FAILED -> Session has ended");
    throw new AppError("Session has ended", 400);
  }

  if (Date.now() > session.expiresAt.getTime()) {
    console.log("FAILED -> Session has expired");
    throw new AppError("Session has expired", 400);
  }


  const alreadyMarked = await Record.findOne({
    sessionId: session._id,
    studentId: student._id,
  });

  if (alreadyMarked) {
    console.log("FAILED -> Already marked");
    throw new AppError("Attendance already marked", 409);
  }


  const faceResult = await faceService.verifyFace({
    userId: student._id,
    liveEmbedding: embedding,
  });

  console.log(
    "Face similarity:",
    faceResult.similarity,
    "Matched:",
    faceResult.matched
  );

  if (!faceResult.matched) {
    console.log("FAILED -> Face does not match");
    throw new AppError("Face verification failed", 403);
  }

  let record;

  try {
    record = await Record.create({
      sessionId: session._id,
      teacherId: session.teacherId,
      classId: session.classId,
      subjectId: session.subjectId,
      studentId: student._id,
      studentLat: payload.studentLat,
      studentLng: payload.studentLng,
      distance: payload.distance,
      markedBy: "SELF",
    });
  } catch (err) {
    
    if (err.code === 11000) {
      console.log("FAILED -> Duplicate key on create (race)");
      throw new AppError("Attendance already marked", 409);
    }

    throw err;
  }

  console.log("Attendance created:", record._id.toString());

  try {
    const presentCount = await Record.countDocuments({ sessionId: session._id });

    getIO().to(`session:${session._id}`).emit("STUDENT_MARKED", {
      sessionId: session._id.toString(),
      studentId: student._id.toString(),
      markedBy: "SELF",
      markedAt: record.markedAt,
      count: 1,
      presentCount,
    });
  } catch (err) {
    console.error("STUDENT_MARKED emit failed:", err.message);
  }

  console.log("========== FACE VERIFICATION SUCCESS ==========");

  return record;
};

// END SESSION

const endSession = async ({ teacher, sessionId }) => {
  const session = await Session.findOne({ _id: sessionId, teacherId: teacher._id });

  if (!session) {
    throw new AppError("Session not found or unauthorized", 401);
  }

  if (!session.isActive) {
    throw new AppError("Session already ended", 400);
  }

  const ended = await Session.findByIdAndUpdate(
    sessionId,
    { $set: { isActive: false } },
    { new: true }
  );

  stopQrRotation(sessionId);

  try {
    getIO().to(`session:${sessionId}`).emit("SESSION_ENDED", {
      sessionId: sessionId.toString(),
    });
  } catch (err) {
    console.error("SESSION_ENDED emit failed:", err.message);
  }

  return ended;
};

const closedExpiredSession = async () => {
  const {
    weekDay: currentDay,
    time: currentTime,
  } = getCurrentDayAndTime();

  const activeSessions = await Session.find({
    isActive: true,
  }).populate("timetableSlotId");

  const expiredIds = activeSessions
    .filter((session) => {
      const slot = session.timetableSlotId;

      if (!slot) {
        return false;
      }

      if (slot.weekDay !== currentDay) {
        return false;
      }

      return (
        slot.endTime <= currentTime &&
        !isTimeInSlot(
          slot.startTime,
          slot.endTime,
          currentTime
        )
      );
    })
    .map((session) => session._id);

  if (!expiredIds.length) {
    return {
      closed: 0,
    };
  }

  await Session.updateMany(
    {
      _id: {
        $in: expiredIds,
      },
    },
    {
      $set: {
        isActive: false,
      },
    }
  );

  expiredIds.forEach((id) => {
    stopQrRotation(id);

    try {
      getIO()
        .to(`session:${id}`)
        .emit("SESSION_ENDED", {
          sessionId: id.toString(),
          reason: "EXPIRED",
        });
    } catch (err) {
      console.error(
        "SESSION_ENDED emit failed:",
        err.message
      );
    }
  });

  return {
    closed: expiredIds.length,
  };
};
// MANUAL ATTENDANCE

const manualAttendance = async ({ teacher, sessionId, studentIds, reason }) => {
  if (!reason || reason.trim().length === 0) {
    throw new AppError("Reason is required for manual attendance", 400);
  }

  const session = await Session.findOne({ _id: sessionId, teacherId: teacher._id });

  if (!session) throw new AppError("Session not found or unauthorized", 401);

  const validStudents = await User.find({
    _id: { $in: studentIds },
    classId: session.classId,
    role: "STUDENT",
  });

  // Set for O(1) lookup instead of array.includes() which is O(n)
  const validStudentIdSet = new Set(validStudents.map((s) => s._id.toString()));

  const existingRecords = await Record.find({
    sessionId,
    studentId: { $in: [...validStudentIdSet] },
  });

  const alreadyMarkedSet = new Set(existingRecords.map((r) => r.studentId.toString()));

  const toCreate = [];
  const skipped = [];

  for (const id of studentIds) {
    const studentId = id.toString();

    if (!validStudentIdSet.has(studentId)) {
      skipped.push({ studentId, reason: "Not a student or not in this class" });
      continue;
    }

    if (alreadyMarkedSet.has(studentId)) {
      skipped.push({ studentId, reason: "Already marked" });
      continue;
    }

    toCreate.push({
      sessionId,
      teacherId: teacher._id,
      classId: session.classId,
      subjectId: session.subjectId,
      studentId,
      markedBy: "TEACHER",
      reason: reason.trim(),
    });
  }

  // single DB write instead of one create() per student in a loop
  const created = toCreate.length > 0 ? await Record.insertMany(toCreate) : [];

  if (created.length > 0) {
    try {
      const presentCount = await Record.countDocuments({ sessionId });

      getIO().to(`session:${sessionId}`).emit("ATTENDANCE_UPDATED", {
        sessionId: sessionId.toString(),
        markedBy: "TEACHER",
        studentId: null,
        count: created.length,
        presentCount,
      });
    } catch (err) {
      console.error("ATTENDANCE_UPDATED emit failed:", err.message);
    }
  }

  return { created: created.length, skipped };
};

// GET ACTIVE SESSION

const getActiveSession = async ({ classId, requester }) => {
  const classExists = await Class.findById(classId);
  if (!classExists) {
    throw new AppError("Class not found", 404);
  }

  const slot = await getActiveSlotByClass({ classId, requester });

  if (!slot) {
    throw new AppError("No active lecture for this class right now", 404);
  }

 
  const resolvedClassId = slot.classInfo.classId;

  const { startOfDay, endOfDay } = getTodayRange();

  const session = await Session.findOne({
    classId: resolvedClassId,
    timetableSlotId: slot.timetableId,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  })
    .sort({ createdAt: -1 })
    .populate("teacherId", "userName")
    .populate("subjectId", "subjectName subjectCode")
    .populate("timetableSlotId", "startTime endTime");

  if (!session) {
    throw new AppError("No session found for this slot today", 404);
  }

  return session;
};

// GET ALL SESSIONS OF CLASS

const getAllSessions = async ({ classId, todayOnly }) => {
  const classExists = await Class.findById(classId);
  if (!classExists) {
    throw new AppError("Class not found", 404);
  }

  const query = { classId };

  if (todayOnly) {
    const { startOfDay, endOfDay } = getTodayRange();
    query.createdAt = { $gte: startOfDay, $lte: endOfDay };
  }

  const sessions = await Session.find(query)
    .populate("teacherId", "userName")
    .populate("subjectId", "subjectName subjectCode")
    .populate("timetableSlotId", "startTime endTime")
    .sort({ createdAt: -1 });

  return sessions;
};

// GET ATTENDANCE FOR A SESSION

const getSessionAttendance = async ({ sessionId }) => {
  const sessionExists = await Session.findById(sessionId);

  if (!sessionExists) {
    throw new AppError("Session doesn't exist", 404);
  }

  const sessionAttendance = await Record.find({ sessionId })
    .populate("classId", "className")
    .populate("teacherId", "userName")
    .populate("studentId", "userName PRN")
    .populate("subjectId", "subjectName subjectCode");

  return sessionAttendance;
};

// GET ABSENT STUDENTS FOR A SESSION

const getAbsentStudents = async ({ sessionId }) => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new AppError("Session doesn't exist", 404);
  }

  const presentStudentIds = await Record.find({ sessionId })
    .select("studentId")
    .then((records) => records.map((r) => r.studentId));

  const absentStudents = await User.find({
    classId: session.classId,
    role: "STUDENT",
    _id: { $nin: presentStudentIds },
  }).select("userName PRN");

  return absentStudents;
};

// GET SESSION REVIEW (present + absent in one call, with optional search)

const getSessionReview = async ({ sessionId, search }) => {
  const session = await Session.findById(sessionId)
    .populate("subjectId", "subjectName subjectCode")
    .populate("timetableSlotId", "startTime endTime");

  if (!session) {
    throw new AppError("Session doesn't exist", 404);
  }

  const studentQuery = {
    classId: session.classId,
    role: "STUDENT",
  };

  if (search && search.trim().length > 0) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    studentQuery.$or = [{ userName: regex }, { PRN: regex }];
  }

  const [students, records] = await Promise.all([
    User.find(studentQuery).select("userName PRN").sort({ userName: 1 }),
    Record.find({ sessionId }).select("studentId markedBy reason markedAt"),
  ]);

  const recordMap = new Map(records.map((r) => [r.studentId.toString(), r]));

  const roster = students.map((student) => {
    const record = recordMap.get(student._id.toString());
    const status = record ? "PRESENT" : "ABSENT";

    return {
      studentId: student._id,
      userName: student.userName,
      PRN: student.PRN,
      status,
      manualAllowed: status === "ABSENT",
      markedBy: record ? record.markedBy : null,
      reason: record ? record.reason : null,
      markedAt: record ? record.markedAt : null,
    };
  });

  const presentCount = roster.filter((r) => r.status === "PRESENT").length;

  return {
    sessionId: session._id,
    sessionActive: session.isActive,
    totalStudents: roster.length,
    presentCount,
    absentCount: roster.length - presentCount,
    roster,
  };
};

// GET LIVE SESSION SUMMARY
//
// Lightweight counts for a teacher dashboard that wants to show a
// present/absent tally without pulling the full roster every time.

const getLiveSummary = async ({ sessionId }) => {
  const session = await Session.findById(sessionId).select(
    "classId isActive qrExpiry expiresAt"
  );

  if (!session) {
    throw new AppError("Session doesn't exist", 404);
  }

  const [totalStudents, presentCount] = await Promise.all([
    User.countDocuments({ classId: session.classId, role: "STUDENT" }),
    Record.countDocuments({ sessionId }),
  ]);

  return {
    sessionId: session._id,
    sessionActive: session.isActive,
    totalStudents,
    present: presentCount,
    absent: totalStudents - presentCount,
    qrExpiry: session.qrExpiry,
    expiresAt: session.expiresAt,
  };
};

// GET TEACHER SESSIONS (used by both teacher-self and HOD-viewing-any-teacher controllers)

const getTeacherSession = async ({ teacherId, todayOnly }) => {
  const query = { teacherId };

  if (todayOnly) {
    const { startOfDay, endOfDay } = getTodayRange();
    query.createdAt = { $gte: startOfDay, $lte: endOfDay };
  }

  const sessions = await Session.find(query)
    .populate("teacherId", "userName")
    .populate("classId", "className")
    .populate("subjectId", "subjectName subjectCode")
    .populate("timetableSlotId", "startTime endTime weekDay")
    .sort({ createdAt: -1 });

  return sessions;
};

// REMOVE ATTENDANCE RECORD

const removeAttendance = async ({ teacherId, recordId }) => {
  const record = await Record.findOneAndDelete({ _id: recordId, teacherId });

  if (!record) {
    throw new AppError("Attendance record not found", 404);
  }

  return record;
};

module.exports = {
  startSession,
  refreshQr,
  submitAttendance,
  verifyFaceAndMarkAttendance,
  endSession,
  closedExpiredSession,
  manualAttendance,
  getActiveSession,
  getAllSessions,
  getTeacherSession,
  getSessionAttendance,
  getAbsentStudents,
  getSessionReview,
  getLiveSummary,
  removeAttendance,
  resumeActiveSessionTimers,
};