const cron = require("node-cron");
const AppError = require("../utils/AppError");

const User = require("../models/user.model");
const AcademicRecord = require("../models/academicRecord.model");
const RiskProfile = require("../models/riskProfile.model");

const { predictRisk } = require("../ml/mlservice");

const {
  aggregateLiveAttendance,
  aggregateAcademicMarks,
  computePerformanceScore,
  buildSubjectPerformance,
  classifySubjects,
} = require("../modules/analytics/analytics.helper");



// Process One Student


async function processStudent(student) {
  const studentId = student._id;
  const classId = student.classId;

  if (!classId) {
    throw new AppError(
      `Student ${studentId} has no class assigned`,
      400
    );
  }

  // Live attendance + academic records
  const [attendance, academicRecords] = await Promise.all([
    aggregateLiveAttendance(studentId, classId),
    AcademicRecord.find({ studentId }).lean(),
  ]);

  // Overall Academic Summary
  const academic = aggregateAcademicMarks(academicRecords);

// preserve null so "no marks yet" isn't stored as "scored 0"
const quizAverage = academic?.quizAverage ?? null;
const assignmentAverage = academic?.assignmentAverage ?? null;
const internalMarks = academic?.internalMarks ?? null;

const performanceScore = computePerformanceScore({
  attendancePercentage: attendance.attendancePercentage,
  quizAverage,
  assignmentAverage,
  internalMarks,
});

  // ML Prediction
  const {
    riskLevel,
    riskScore,
    passProbability,
    predictedBy,
  } = await predictRisk({
    attendancePercentage: attendance.attendancePercentage,
    quizAverage,
    assignmentAverage,
    internalMarks,
    performanceScore,
  });


  // Subject Wise Performance


  const academicMap = new Map(
    academicRecords.map((record) => [
      record.subjectId.toString(),
      record,
    ])
  );

  const subjectStats = attendance.subjectWise.map((subject) =>
    buildSubjectPerformance({
      attendance: subject,
      academic: academicMap.get(subject.subjectId.toString()),
    })
  );

  const { weak, strong } = classifySubjects(subjectStats);

  
  // Save Risk Profile


  await RiskProfile.findOneAndUpdate(
    { studentId },
    {
      $set: {
        studentId,

        attendancePercentage: attendance.attendancePercentage,

        quizAverage,
        assignmentAverage,
        internalMarks,

        performanceScore,

        riskLevel,
        riskScore,
        passProbability,

        weakSubjects: weak,
        strongSubjects: strong,

        predictedBy,
        lastUpdated: new Date(),
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
    }
  );
}



// Analytics Job


async function runAnalyticsJob() {
  console.log(
    `[AnalyticsJob] Started at ${new Date().toISOString()}`
  );

  const students = await User.find(
    {
      role: "STUDENT",
      classId: { $ne: null },
    },
    {
      _id: 1,
      classId: 1,
    }
  ).lean();

  if (!students.length) {
    console.log("[AnalyticsJob] No students found. Skipping.");
    return;
  }

  console.log(
    `[AnalyticsJob] Processing ${students.length} students...`
  );

  const results = {
    success: [],
    failed: [],
  };

  for (const student of students) {
    try {
      await processStudent(student);
      results.success.push(student._id);
    } catch (err) {
      results.failed.push({
        studentId: student._id,
        reason: err.message,
      });
    }
  }

  console.log(
    `[AnalyticsJob] Done — Success: ${results.success.length} | Failed: ${results.failed.length}`
  );

  if (results.failed.length) {
    console.error(
      "[AnalyticsJob] Failed students:",
      results.failed
    );
  }
}



// Schedule


function scheduleAnalyticsJob() {
  cron.schedule("0 */5 * * *", async () => {
    try {
      await runAnalyticsJob();
    } catch (err) {
      console.error("[AnalyticsJob] Unhandled Error:", err);
    }
  });

  console.log(
    "[AnalyticsJob] Scheduled — runs every 5 hours"
  );
}

module.exports = {
  scheduleAnalyticsJob,
  runAnalyticsJob,
};