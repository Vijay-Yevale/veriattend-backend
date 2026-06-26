const cron       = require("node-cron");
const mongoose   = require("mongoose");
const AppError   = require("../utils/AppError")

const User           = require("../models/user.model");
const Session        = require("../models/attendanceSession.model");
const Record         = require("../models/attendanceRecord.model");
const AcademicRecord = require("../models/academicRecord.model");
const RiskProfile    = require("../models/riskProfile.model");
const { predictRisk } = require("../ml/mlservice");

//  constants 
const WEAK_SUBJECT_THRESHOLD   = 75;
const STRONG_SUBJECT_THRESHOLD = 85;

//  utility: average of array 
function avg(arr) {
  if (!arr || arr.length === 0) return 0;
  return parseFloat(
    (arr.reduce((sum, v) => sum + v, 0) / arr.length).toFixed(2)
  );
}

//  utility: compute performance score 
// weights → attendance 20% | quiz 25% | assignment 25% | internal 30%
// internalMarks out of 30 → normalize to 100 before applying weight
function computePerformanceScore({
  attendancePercentage,
  quizAverage,
  assignmentAverage,
  internalMarks,
}) {
  const internalNormalized = ((internalMarks ?? 0) / 30) * 100;

  return parseFloat(
    (
      attendancePercentage * 0.20 +
      quizAverage          * 0.25 +
      assignmentAverage    * 0.25 +
      internalNormalized   * 0.30
    ).toFixed(2)
  );
}

//  utility: classify subjects 
function classifySubjects(subjectWise) {
  const weak   = [];
  const strong = [];

  for (const subject of subjectWise) {
    if (subject.attendancePercentage < WEAK_SUBJECT_THRESHOLD) {
      weak.push(subject);
    } else if (subject.attendancePercentage >= STRONG_SUBJECT_THRESHOLD) {
      strong.push(subject);
    }
  }

  return { weak, strong };
}

//  aggregate attendance for one student
// Session model has: classId, subjectId
// Record  model has: studentId, subjectId
// Record only stores PRESENT → total sessions - records = absent
async function aggregateAttendance(studentId, classId) {

  // total sessions per subject for this class
  const allSessions = await Session.aggregate([
    {
      $match: { classId: new mongoose.Types.ObjectId(classId) },
    },
    {
      $group: {
        _id: "$subjectId",
        totalClasses: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from:         "subjects",
        localField:   "_id",
        foreignField: "_id",
        as:           "subject",
      },
    },
    { $unwind: "$subject" },
    {
      $project: {
        subjectId:    "$_id",
        subjectName:  "$subject.subjectName",
        totalClasses: 1,
      },
    },
  ]);

  if (!allSessions.length) {
    // no sessions conducted yet for this class — return zeroes
    return {
      attendancePercentage: 0,
      totalClasses:         0,
      totalAttended:        0,
      subjectWise:          [],
    };
  }

  // sessions this student attended per subject
  const attendedSessions = await Record.aggregate([
    {
      $match: { studentId: new mongoose.Types.ObjectId(studentId) },
    },
    {
      $group: {
        _id:             "$subjectId",
        attendedClasses: { $sum: 1 },
      },
    },
  ]);

  // map attended count by subjectId for O(1) lookup
  const attendedMap = {};
  for (const a of attendedSessions) {
    attendedMap[a._id.toString()] = a.attendedClasses;
  }

  let totalClasses  = 0;
  let totalAttended = 0;
  const subjectWise = [];

  for (const s of allSessions) {
    const attended   = attendedMap[s.subjectId.toString()] ?? 0;
    const percentage = s.totalClasses > 0
      ? parseFloat(((attended / s.totalClasses) * 100).toFixed(2))
      : 0;

    totalClasses  += s.totalClasses;
    totalAttended += attended;

    subjectWise.push({
      subjectId:            s.subjectId,
      subjectName:          s.subjectName,
      totalClasses:         s.totalClasses,
      attendedClasses:      attended,
      attendancePercentage: percentage,
    });
  }

  const attendancePercentage = totalClasses > 0
    ? parseFloat(((totalAttended / totalClasses) * 100).toFixed(2))
    : 0;

  return {
    attendancePercentage,
    totalClasses,
    totalAttended,
    subjectWise,
  };
}

//  process one student 
async function processStudent(student) {
  const studentId = student._id;
  const classId   = student.classId;

  if (!classId) {
    throw new AppError(`Student ${studentId} has no classId assigned`, 400);
  }

  // 1. aggregate attendance
  const attendanceData = await aggregateAttendance(studentId, classId);

  // 2. fetch academic marks
  const academic = await AcademicRecord.findOne({ studentId }).lean();

  const quizAverage       = academic ? avg(academic.quizMarks)       : 0;
  const assignmentAverage = academic ? avg(academic.assignmentMarks) : 0;
  const internalMarks     = academic?.internalMarks ?? 0;

  // 3. compute performance score
  const performanceScore = computePerformanceScore({
    attendancePercentage: attendanceData.attendancePercentage,
    quizAverage,
    assignmentAverage,
    internalMarks,
  });

  // 4. predict risk (ML or fallback)
  const { riskLevel, riskScore, passProbability, predictedBy } =
    await predictRisk({
      attendancePercentage: attendanceData.attendancePercentage,
      quizAverage,
      assignmentAverage,
      internalMarks,
      performanceScore,
    });

  // 5. classify subjects
  const { weak, strong } = classifySubjects(attendanceData.subjectWise);

  // 6. upsert RiskProfile
  const profile = await RiskProfile.findOneAndUpdate(
    { studentId },
    {
      $set: {
        studentId,
        classId,
        attendancePercentage: attendanceData.attendancePercentage,
        quizAverage,
        assignmentAverage,
        internalMarks,
        performanceScore,
        riskLevel,
        riskScore,
        passProbability,
        weakSubjects:   weak,
        strongSubjects: strong,
        predictedBy,
        lastUpdated:    new Date(),
      },
    },
    { upsert: true, new: true }
  );

  if (!profile) {
    throw new AppError(`Failed to save risk profile for student ${studentId}`, 500);
  }

  return profile;
}

//  main job 
const runAnalyticsJob = async () => {
  console.log(`[AnalyticsJob] Started at ${new Date().toISOString()}`);

  const students = await User.find(
    { role: "STUDENT", classId: { $ne: null } },
    { _id: 1, classId: 1 }
  ).lean();

  if (!students.length) {
    console.log("[AnalyticsJob] No students found. Skipping.");
    return;
  }

  console.log(`[AnalyticsJob] Processing ${students.length} students...`);

  const results = { success: [], failed: [] };

  for (const student of students) {
    try {
      await processStudent(student);
      results.success.push(student._id);
    } catch (err) {
      results.failed.push({ studentId: student._id, reason: err.message });
    }
  }

  console.log(
    `[AnalyticsJob] Done — Success: ${results.success.length} | Failed: ${results.failed.length}`
  );

  if (results.failed.length) {
    console.error("[AnalyticsJob] Failed students:", results.failed);
  }
};

// schedule every 5 hours
const scheduleAnalyticsJob = () => {
  cron.schedule("0 */5 * * *", async () => {
    await runAnalyticsJob();
  });

  console.log("[AnalyticsJob] Scheduled — runs every 5 hours");
};

module.exports = { scheduleAnalyticsJob, runAnalyticsJob };