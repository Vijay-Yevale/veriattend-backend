const Session = require("../../models/attendancesession.model");
const Record = require("../../models/attendanceRecord.model");
const User = require("../../models/user.model");
const AppError = require("../../utils/AppError");
const crypto = require("crypto");
const Class = require("../../models/class.model");
const { getActiveSlot, getActiveSlotByClass } = require("../timetable/timetable.service");
const { getTodayRange } = require("../../utils/dateRange");


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


// START SESSION


const startSession = async ({ teacherId, anchorLat, anchorLng }) => {
  const { startOfDay, endOfDay } = getTodayRange();
  const slot = await getActiveSlot(teacherId);

  const qrToken = crypto.randomBytes(32).toString("hex");

  const existingSession = await Session.findOne({
    classId: slot.classId,
    subjectId: slot.subjectId,
    timetableSlotId: slot._id,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  }).sort({ createdAt: -1 });

  if (existingSession?.isActive && existingSession.expiresAt > new Date()) {
    return existingSession;
  }

  if (existingSession) {
    const reopened = await Session.findByIdAndUpdate(
      existingSession._id,
      {
        $set: {
          isActive: true,
          teacherId,        // re-stamp
          anchorLat,
          anchorLng,
          expiresAt: new Date(Date.now() + 2 * 60 * 1000),
          qrToken,          // rotate the token so the old one is dead
          qrExpiry: new Date(Date.now() + 30000),
        },
      },
      { new: true }
    );

    return reopened;
  }

  const newSession = await Session.create({
    teacherId,
    classId: slot.classId,
    subjectId: slot.subjectId,
    timetableSlotId: slot._id,
    anchorLat,
    anchorLng,
    qrToken,
    qrExpiry: new Date(Date.now() + 30000),
    expiresAt: new Date(Date.now() + 2 * 60 * 1000),
  });

  return newSession;
};


// REFRESH QR


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
    const qrToken = crypto.randomBytes(32).toString("hex");

    const qrExpiry = new Date(Date.now() + 30000);

    const updated = await Session.findByIdAndUpdate(
      sessionId,
      { $set: { qrToken, qrExpiry } },
      { new: true }
    );

    return updated.qrToken;
  }

  return session.qrToken;
};


// SUBMIT ATTENDANCE


const submitAttendance = async ({
  student,
  deviceId,
  studentLat,
  studentLng,
  qrToken,
}) => {
  const session = await Session.findOne({
    qrToken,
    isActive: true,
  });

  if (!session) {
    throw new AppError("Invalid QR code", 404);
  }

  if (Date.now() > session.expiresAt.getTime()) {
    throw new AppError("Session has expired", 400);
  }

  if (Date.now() > session.qrExpiry.getTime()) {
    throw new AppError("QR code has expired, scan the new one", 400);
  }

  if (
    !student.classId ||
    session.classId.toString() !== student.classId.toString()
  ) {
    throw new AppError("You do not belong to this class", 401);
  }

  if (!student.deviceId) {
    student.deviceId = deviceId;

    await User.findByIdAndUpdate(student._id, {
      $set: { deviceId },
    });
  } else if (student.deviceId !== deviceId) {
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
    throw new AppError("You are too far from the classroom", 400);
  }

  const alreadyMarked = await Record.findOne({
    sessionId: session._id,
    studentId: student._id,
  });

  if (alreadyMarked) {
    throw new AppError("Attendance already marked", 400);
  }

  const record = await Record.create({
    sessionId: session._id,
    teacherId: session.teacherId,
    classId: session.classId,
    subjectId: session.subjectId,
    studentId: student._id,
    studentLat,
    studentLng,
    markedBy: "SELF",
  });

  return record;
};


// END SESSION


const endSession = async ({ teacher, sessionId }) => {
  const session = await Session.findOne({
    _id: sessionId,
    teacherId: teacher._id,
  });

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

  return ended;
};




const closedExpiredSession = async () => {
  const now = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDay = days[now.getDay()];
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const activeSessions = await Session.find({ isActive: true }).populate("timetableSlotId");

  const expiredIds = activeSessions
    .filter(
      (s) =>
        s.timetableSlotId &&
        s.timetableSlotId.weekDay === currentDay &&
        s.timetableSlotId.endTime < currentTime
    )
    .map((s) => s._id);

  if (!expiredIds.length) {
    return { closed: 0 };
  }

  await Session.updateMany(
    { _id: { $in: expiredIds } },
    { $set: { isActive: false } }
  );

  return { closed: expiredIds.length };
};


// MANUAL ATTENDANCE


const manualAttendance = async ({ teacher, sessionId, studentIds, reason }) => {

  if (!reason || reason.trim().length === 0) {
    throw new AppError("Reason is required for manual attendance", 400);
  }

  const session = await Session.findOne({
    _id: sessionId,
    teacherId: teacher._id,
  });



  if (!session) {
    throw new AppError("Session not found or unauthorized", 401);
  }

  const validStudents = await User.find({
    _id: { $in: studentIds },
    classId: session.classId,
    role: "STUDENT",
  });

 

  const validStudentIds = validStudents.map((s) => s._id.toString());

  console.log("validStudentIds:", validStudentIds);

  const existingRecords = await Record.find({
    sessionId,
    studentId: { $in: validStudentIds },
  });


  const alreadyMarkedIds = existingRecords.map((r) =>
    r.studentId.toString()
  );


  const created = [];
  const skipped = [];

  for (const id of studentIds) {
    console.log("Processing student:", id);

    const studentId = id.toString();

    if (!validStudentIds.includes(studentId)) {
      console.log("Skipped - invalid student");

      skipped.push({
        studentId,
        reason: "Not found or not in this class",
      });
      continue;
    }

    if (alreadyMarkedIds.includes(studentId)) {
      console.log("Skipped - already marked");

      skipped.push({
        studentId,
        reason: "Already marked",
      });
      continue;
    }


    const record = await Record.create({
      sessionId,
      teacherId: teacher._id,
      classId: session.classId,
      subjectId: session.subjectId,
      studentId,
      markedBy: "TEACHER",
      reason: reason.trim(),
    });


    created.push(record);
  }

 

  return { created, skipped };
};


// GET ACTIVE SESSION


const getActiveSession = async ({ classId }) => {
  const classExists = await Class.findById(classId);
  if (!classExists) {
    throw new AppError("Class not found", 404);
  }

  const slot = await getActiveSlotByClass(classId);
  const { startOfDay, endOfDay } = getTodayRange();

  const session = await Session.findOne({
    classId,
    timetableSlotId: slot._id,
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

  if (!sessions.length) {
    throw new AppError("No sessions found", 404);
  }

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

  if (!sessions.length) {
    throw new AppError("No sessions found", 404);
  }

  return sessions;
};


// REMOVE ATTENDANCE RECORD


const removeAttendance = async ({ teacherId, recordId }) => {
  const record = await Record.findOneAndDelete({
    _id: recordId,
    teacherId,
  });

  if (!record) {
    throw new AppError("Attendance record not found", 404);
  }

  return record;
};


module.exports = {
  startSession,
  refreshQr,
  submitAttendance,
  endSession,
  closedExpiredSession,
  manualAttendance,
  getActiveSession,
  getAllSessions,
  getTeacherSession,
  getSessionAttendance,
  getAbsentStudents,
  removeAttendance,
};