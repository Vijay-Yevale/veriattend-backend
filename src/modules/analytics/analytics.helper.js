// analytics.helper.js

const mongoose = require("mongoose");
const Session = require("../../models/attendancesession.model");
const Record = require("../../models/attendanceRecord.model");
const TeacherSubject = require("../../models/teachersubject.model");

const QUIZ_MAX = 10;
const ASSIGNMENT_MAX = 25;
const INTERNAL_MAX = 30;


// Pure utility functions


function avg(arr) {
  if (!arr || arr.length === 0) return null;

  return parseFloat(
    (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2)
  );
}

// Clamp a number between min and max.
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}


// Risk


function computeSubjectRisk(performanceScore) {
  if (performanceScore >= 80) {
    return "LOW";
  }

  if (performanceScore >= 60) {
    return "MEDIUM";
  }

  return "HIGH";
}


// Class → Subject Attendance


async function aggregateSubjectAttendanceForClass(
  classId,
  subjectId
) {
  // Total sessions conducted for this subject.
  const totalClasses = await Session.countDocuments({
    classId,
    subjectId,
  });

  // Attendance records grouped by student.
  const attended = await Record.aggregate([
    {
      $match: {
        classId: new mongoose.Types.ObjectId(classId),
        subjectId: new mongoose.Types.ObjectId(subjectId),
      },
    },
    {
      $group: {
        _id: "$studentId",
        totalAttended: {
          $sum: 1,
        },
      },
    },
  ]);

  const attendanceMap = {};

  for (const student of attended) {
    // Never allow attendance to exceed conducted sessions.
    const totalAttended = Math.min(
      student.totalAttended,
      totalClasses
    );

    attendanceMap[student._id.toString()] = {
      subjectId,

      attendancePercentage:
        totalClasses > 0
          ? clamp(
              parseFloat(
                ((totalAttended / totalClasses) * 100).toFixed(2)
              ),
              0,
              100
            )
          : 0,

      totalClasses,

      totalAttended,

      classesMissed: Math.max(
        0,
        totalClasses - totalAttended
      ),

      classesNeededFor75: classesNeededFor75(
        totalAttended,
        totalClasses
      ),
    };
  }

  return {
    totalClasses,
    attendanceMap,
  };
}


// Student → Single Subject Attendance


async function aggregateSubjectAttendance(
  studentId,
  classId,
  subjectId
) {
  const totalClasses = await Session.countDocuments({
    classId,
    subjectId,
  });

  const rawAttended = await Record.countDocuments({
    studentId,
    classId,
    subjectId,
  });

  // Cannot attend more sessions than were conducted.
  const totalAttended = Math.min(
    rawAttended,
    totalClasses
  );

  const attendancePercentage =
    totalClasses > 0
      ? clamp(
          parseFloat(
            ((totalAttended / totalClasses) * 100).toFixed(2)
          ),
          0,
          100
        )
      : 0;

  return {
    attendancePercentage,
    totalClasses,
    totalAttended,
    classesMissed: Math.max(
      0,
      totalClasses - totalAttended
    ),
    classesNeededFor75: classesNeededFor75(
      totalAttended,
      totalClasses
    ),
  };
}


// Performance Score


function computePerformanceScore({
  attendancePercentage,
  quizAverage,
  assignmentAverage,
  internalMarks,
}) {
  const quizNormalized = clamp(
    ((quizAverage ?? 0) / QUIZ_MAX) * 100,
    0,
    100
  );

  const assignmentNormalized = clamp(
    ((assignmentAverage ?? 0) / ASSIGNMENT_MAX) * 100,
    0,
    100
  );

  const internalNormalized = clamp(
    ((internalMarks ?? 0) / INTERNAL_MAX) * 100,
    0,
    100
  );

  const attendanceNormalized = clamp(
    attendancePercentage ?? 0,
    0,
    100
  );

  const score =
    attendanceNormalized * 0.20 +
    quizNormalized * 0.25 +
    assignmentNormalized * 0.25 +
    internalNormalized * 0.30;

  return clamp(
    parseFloat(score.toFixed(2)),
    0,
    100
  );
}


// Subject Classification


function classifySubjects(subjectStats) {
  const weak = [];
  const strong = [];

  for (const subject of subjectStats) {
    if (subject.riskLevel === "HIGH") {
      weak.push(subject);
    } else if (subject.riskLevel === "LOW") {
      strong.push(subject);
    }
  }

  return {
    weak,
    strong,
  };
}

// Subject Performance


function buildSubjectPerformance({
  attendance,
  academic,
}) {
  const quizAverage = avg(
    academic?.quizMarks ?? []
  );

  const assignmentAverage = avg(
    academic?.assignmentMarks ?? []
  );

  const internalMarks =
    academic?.internalMarks ?? null;

  const performanceScore =
    computePerformanceScore({
      attendancePercentage:
        attendance.attendancePercentage,

      quizAverage: quizAverage ?? 0,

      assignmentAverage:
        assignmentAverage ?? 0,

      internalMarks:
        internalMarks ?? 0,
    });

  return {
    subjectId: attendance.subjectId,

    attendancePercentage:
      attendance.attendancePercentage,

    quizAverage,

    assignmentAverage,

    internalMarks,

    performanceScore,

    riskLevel:
      computeSubjectRisk(performanceScore),
  };
}


// Classes Needed For 75%


function classesNeededFor75(attended, total) {
  if (total === 0) return 0;

  if (attended / total >= 0.75) {
    return 0;
  }

  const x = Math.ceil(
    (0.75 * total - attended) / 0.25
  );

  return x > 0 ? x : 0;
}


// Student Overall Attendance


async function aggregateLiveAttendance(
  studentId,
  classId
) {
  // Get all conducted sessions grouped by subject.
  const allSessions = await Session.aggregate([
    {
      $match: {
        classId:
          new mongoose.Types.ObjectId(classId),
      },
    },
    {
      $group: {
        _id: "$subjectId",

        totalClasses: {
          $sum: 1,
        },
      },
    },
    {
      $lookup: {
        from: "subjects",

        localField: "_id",

        foreignField: "_id",

        as: "subject",
      },
    },
    {
      $unwind: "$subject",
    },
    {
      $project: {
        subjectId: "$_id",

        subjectName:
          "$subject.subjectName",

        subjectCode:
          "$subject.subjectCode",

        totalClasses: 1,
      },
    },
  ]);

  // No sessions conducted yet.
  if (!allSessions.length) {
    return {
      attendancePercentage: 0,

      totalClasses: 0,

      totalAttended: 0,

      classesMissed: 0,

      classesNeededFor75: 0,

      subjectWise: [],
    };
  }

  // Get attendance records only for the student's
  // CURRENT class.
  const attendedSessions =
    await Record.aggregate([
      {
        $match: {
          studentId:
            new mongoose.Types.ObjectId(
              studentId
            ),

          classId:
            new mongoose.Types.ObjectId(
              classId
            ),
        },
      },
      {
        $group: {
          _id: "$subjectId",

          attendedClasses: {
            $sum: 1,
          },
        },
      },
    ]);

  const attendedMap = {};

  for (const a of attendedSessions) {
    attendedMap[
      a._id.toString()
    ] = a.attendedClasses;
  }

  let totalClasses = 0;

  let totalAttended = 0;

  const subjectWise = [];

  for (const s of allSessions) {
    // Attendance for this subject.
    const attended = Math.min(
      attendedMap[
        s.subjectId.toString()
      ] ?? 0,

      s.totalClasses
    );

    const percentage =
      s.totalClasses > 0
        ? clamp(
            parseFloat(
              (
                (attended /
                  s.totalClasses) *
                100
              ).toFixed(2)
            ),
            0,
            100
          )
        : 0;

    totalClasses += s.totalClasses;

    totalAttended += attended;

  


    subjectWise.push({
      subjectId: s.subjectId,

      subjectName:
        s.subjectName,

      subjectCode:
        s.subjectCode,

      totalClasses:
        s.totalClasses,

      totalAttended:
        attended,

      classesMissed:
        Math.max(
          0,
          s.totalClasses - attended
        ),

      attendancePercentage:
        percentage,

      classesNeededFor75:
        classesNeededFor75(
          attended,
          s.totalClasses
        ),
    });
  }

  // Safety: attended can never exceed total.
  totalAttended = Math.min(
    totalAttended,
    totalClasses
  );

  const attendancePercentage =
    totalClasses > 0
      ? clamp(
          parseFloat(
            (
              (totalAttended /
                totalClasses) *
              100
            ).toFixed(2)
          ),
          0,
          100
        )
      : 0;

  return {
    attendancePercentage,

    totalClasses,

    totalAttended,

    classesMissed:
      Math.max(
        0,
        totalClasses - totalAttended
      ),

    classesNeededFor75:
      classesNeededFor75(
        totalAttended,
        totalClasses
      ),

    subjectWise,
  };
}


// Academic Records


function aggregateAcademicMarks(records) {
  if (!records || records.length === 0) {
    return {
      quizMarks: [],
      quizAverage: null,
      assignmentMarks: [],
      assignmentAverage: null,
      internalMarks: null,
    };
  }

  const allQuizMarks = [];

  const allAssignmentMarks = [];

  const internalMarksList = [];

  for (const record of records) {
    if (record.quizMarks?.length) {
      allQuizMarks.push(
        ...record.quizMarks
      );
    }

    if (record.assignmentMarks?.length) {
      allAssignmentMarks.push(
        ...record.assignmentMarks
      );
    }

    if (
      record.internalMarks !== null &&
      record.internalMarks !== undefined
    ) {
      internalMarksList.push(
        record.internalMarks
      );
    }
  }

  return {
    quizMarks: allQuizMarks,

    quizAverage:
      avg(allQuizMarks),

    assignmentMarks:
      allAssignmentMarks,

    assignmentAverage:
      avg(allAssignmentMarks),

    internalMarks:
      avg(internalMarksList),
  };
}


// Risk Map


function createRiskMap(riskProfiles) {
  const map = {};

  for (const r of riskProfiles) {
    map[
      r.studentId.toString()
    ] = r;
  }

  return map;
}


// Student Analytics


function buildStudentAnalytics(
  student,
  risk
) {
  return {
    studentId:
      student._id,

    userName:
      student.userName,

    PRN:
      student.PRN,

    classId:
      student.classId ?? null,

    attendancePercentage:
      risk?.attendancePercentage ?? null,

    performanceScore:
      risk?.performanceScore ?? null,

    riskLevel:
      risk?.riskLevel ?? null,

    passProbability:
      risk?.passProbability ?? null,

    weakSubjects:
      risk?.weakSubjects ?? [],

    strongSubjects:
      risk?.strongSubjects ?? [],

    lastUpdated:
      risk?.lastUpdated ?? null,
  };
}

// Dashboard Student


function buildDashboardStudent(
  student,
  risk
) {
  return {
    studentId:
      student._id,

    userName:
      student.userName,

    PRN:
      student.PRN,

    attendancePercentage:
      risk?.attendancePercentage ?? null,

    performanceScore:
      risk?.performanceScore ?? null,

    riskLevel:
      risk?.riskLevel ?? null,
  };
}


// Dashboard Summary


function buildDashboardSummary(
  students
) {
  const withRisk =
    students.filter(
      (s) => s.riskLevel !== null
    );

  const highRisk =
    withRisk.filter(
      (s) => s.riskLevel === "HIGH"
    );

  const mediumRisk =
    withRisk.filter(
      (s) => s.riskLevel === "MEDIUM"
    );

  const lowRisk =
    withRisk.filter(
      (s) => s.riskLevel === "LOW"
    );

  const defaulters =
    withRisk.filter(
      (s) =>
        s.attendancePercentage !== null &&
        s.attendancePercentage < 75
    );

  const avgAttendance =
    withRisk.length
      ? parseFloat(
          (
            withRisk.reduce(
              (acc, s) =>
                acc +
                (s.attendancePercentage ??
                  0),

              0
            ) /
            withRisk.length
          ).toFixed(2)
        )
      : null;

  const avgPerformance =
    withRisk.length
      ? parseFloat(
          (
            withRisk.reduce(
              (acc, s) =>
                acc +
                (s.performanceScore ??
                  0),

              0
            ) /
            withRisk.length
          ).toFixed(2)
        )
      : null;

  return {
    summary: {
      totalStudents:
        students.length,

      averageAttendance:
        avgAttendance,

      averagePerformance:
        avgPerformance,

      highRiskCount:
        highRisk.length,

      mediumRiskCount:
        mediumRisk.length,

      lowRiskCount:
        lowRisk.length,

      defaultersCount:
        defaulters.length,
    },

    filters: {
      highRisk:
        highRisk.map(
          (s) => s.studentId
        ),

      lowRisk:
        lowRisk.map(
          (s) => s.studentId
        ),

      mediumRisk:
        mediumRisk.map(
          (s) => s.studentId
        ),

      defaulters:
        defaulters.map(
          (s) => s.studentId
        ),
    },
  };
}


// Available Subjects


async function getAvailableSubjects(
  classId,
  currentUser,
  isClassTeacher
) {
  let assignments;

  switch (currentUser.role) {
    case "TEACHER":
      if (isClassTeacher) {
        assignments =
          await TeacherSubject.find({
            classId,
            isActive: true,
          })
            .populate(
              "subjectId",
              "subjectName subjectCode"
            )
            .lean();
      } else {
        assignments =
          await TeacherSubject.find({
            teacherId:
              currentUser._id,

            classId,

            isActive: true,
          })
            .populate(
              "subjectId",
              "subjectName subjectCode"
            )
            .lean();
      }
      break;

    case "HOD":
    case "SUPER_ADMIN":
      assignments =
        await TeacherSubject.find({
          classId,
          isActive: true,
        })
          .populate(
            "subjectId",
            "subjectName subjectCode"
          )
          .lean();
      break;

    default:
      return [];
  }

  // Remove duplicate subjects.
  const subjectMap =
    new Map();

  for (const assignment of assignments) {
    const subject =
      assignment.subjectId;

    if (!subject) continue;

    subjectMap.set(
      subject._id.toString(),
      {
        subjectId:
          subject._id,

        subjectName:
          subject.subjectName,

        subjectCode:
          subject.subjectCode,
      }
    );
  }

  return [
    ...subjectMap.values(),
  ];
}


// Subject Info


const buildSubjectInfo = (
  subjectAssignment
) => ({
  subjectId:
    subjectAssignment.subjectId._id,

  subjectName:
    subjectAssignment.subjectId
      .subjectName,

  subjectCode:
    subjectAssignment.subjectId
      .subjectCode,

  teacher: {
    teacherId:
      subjectAssignment.teacherId._id,

    userName:
      subjectAssignment.teacherId
        .userName,
  },
});



module.exports = {
  avg,
  clamp,
  classesNeededFor75,

  createRiskMap,

  computePerformanceScore,
  computeSubjectRisk,

  aggregateSubjectAttendanceForClass,
  aggregateSubjectAttendance,

  classifySubjects,

  buildSubjectPerformance,
  buildDashboardStudent,

  buildStudentAnalytics,
  buildDashboardSummary,

  aggregateAcademicMarks,
  aggregateLiveAttendance,

  getAvailableSubjects,
  buildSubjectInfo,
};