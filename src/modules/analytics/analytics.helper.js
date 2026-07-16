const mongoose = require("mongoose");
const Session = require("../../models/attendancesession.model");
const Record = require("../../models/attendanceRecord.model");
const TeacherSubject = require("../../models/teachersubject.model");

const QUIZ_MAX = 10;
const ASSIGNMENT_MAX = 25;
const INTERNAL_MAX = 30;


//  pure utility functions

function avg(arr) {
  if (!arr || arr.length === 0) return null;
  return parseFloat(
    (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2)
  );
}

function computeSubjectRisk(performanceScore) {
  if (performanceScore >= 80) {
    return "LOW";
  }

  if (performanceScore >= 60) {
    return "MEDIUM";
  }

  return "HIGH";
}

// Aggregate attendance for one subject across the entire class
async function aggregateSubjectAttendanceForClass(
  classId,
  subjectId
) {
  // Total sessions conducted for this subject
  const totalClasses = await Session.countDocuments({
    classId,
    subjectId,
  });

  // Attendance count grouped by student
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
        totalAttended: { $sum: 1 },
      },
    },
  ]);

  const attendanceMap = {};

  for (const student of attended) {
    const totalAttended = student.totalAttended;

    attendanceMap[student._id.toString()] = {
      subjectId,

      attendancePercentage:
        totalClasses > 0
          ? parseFloat(
              ((totalAttended / totalClasses) * 100).toFixed(2)
            )
          : 0,

      totalClasses,

      totalAttended,

      classesMissed: totalClasses - totalAttended,

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

// Aggregate attendance for a single student in a single subject
async function aggregateSubjectAttendance(
  studentId,
  classId,
  subjectId
) {
  const totalClasses = await Session.countDocuments({
    classId,
    subjectId,
  });

  const totalAttended = await Record.countDocuments({
    studentId,
    classId,
    subjectId,
  });

  const attendancePercentage =
    totalClasses > 0
      ? parseFloat(
          ((totalAttended / totalClasses) * 100).toFixed(2)
        )
      : 0;

  return {
    attendancePercentage,
    totalClasses,
    totalAttended,
    classesMissed: totalClasses - totalAttended,
    classesNeededFor75: classesNeededFor75(
      totalAttended,
      totalClasses
    ),
  };
}

function computePerformanceScore({
  attendancePercentage,
  quizAverage,
  assignmentAverage,
  internalMarks,
}) {
  const quizNormalized =
  ((quizAverage ?? 0) / QUIZ_MAX) * 100;

const assignmentNormalized =
  ((assignmentAverage ?? 0) / ASSIGNMENT_MAX) * 100;

const internalNormalized =
  ((internalMarks ?? 0) / INTERNAL_MAX) * 100;

  return parseFloat(
    (
      attendancePercentage * 0.20 +
      quizNormalized * 0.25 +
      assignmentNormalized * 0.25 +
      internalNormalized * 0.30
    ).toFixed(2)
  );
}

//  utility: classify subjects 
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

function buildSubjectPerformance({
  attendance,
  academic,
}) {
  const quizAverage = avg(academic?.quizMarks ?? []);
  const assignmentAverage = avg(academic?.assignmentMarks ?? []);
  const internalMarks = academic?.internalMarks ?? null;

  const performanceScore = computePerformanceScore({
    attendancePercentage: attendance.attendancePercentage,
    quizAverage: quizAverage ?? 0,
    assignmentAverage: assignmentAverage ?? 0,
    internalMarks: internalMarks ?? 0,
  });

  return {
    subjectId: attendance.subjectId,
  
    attendancePercentage: attendance.attendancePercentage,

    quizAverage,
    assignmentAverage,
    internalMarks,

    performanceScore,
    riskLevel: computeSubjectRisk(performanceScore),
  };
}

function classesNeededFor75(attended, total) {
  if (total === 0) return 0;
  if (attended / total >= 0.75) return 0;
  const x = Math.ceil((0.75 * total - attended) / 0.25);
  return x > 0 ? x : 0;
}

//  aggregate live attendance for one student 
async function aggregateLiveAttendance(studentId, classId) {
  const allSessions = await Session.aggregate([
    { $match: { classId: new mongoose.Types.ObjectId(classId) } },
    {
      $group: {
        _id:          "$subjectId",
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
        subjectCode:  "$subject.subjectCode",
        totalClasses: 1,
      },
    },
  ]);

  if (!allSessions.length) {
    return {
      attendancePercentage: 0,
      totalClasses:         0,
      totalAttended:        0,
      classesMissed:        0,
      classesNeededFor75:   0,
      subjectWise:          [],
    };
  }

  const attendedSessions = await Record.aggregate([
    { $match: { studentId: new mongoose.Types.ObjectId(studentId) } },
    {
      $group: {
        _id:             "$subjectId",
        attendedClasses: { $sum: 1 },
      },
    },
  ]);

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
      subjectCode:          s.subjectCode,
      totalClasses:         s.totalClasses,
      attendedClasses:      attended,
      missedClasses:        s.totalClasses - attended,
      attendancePercentage: percentage,
      classesNeededFor75:   classesNeededFor75(attended, s.totalClasses),
    });
  }

  const attendancePercentage = totalClasses > 0
    ? parseFloat(((totalAttended / totalClasses) * 100).toFixed(2))
    : 0;

  return {
    attendancePercentage,
    totalClasses,
    totalAttended,
    classesMissed:      totalClasses - totalAttended,
    classesNeededFor75: classesNeededFor75(totalAttended, totalClasses),
    subjectWise,
  };
}
//  aggregate a student's AcademicRecord docs (one per subject)
// into one flat summary — mirrors aggregateLiveAttendance's pattern
// for the attendance side. records must come from .find(), not .findOne()
function aggregateAcademicMarks(records) {
  // No academic records yet
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
      allQuizMarks.push(...record.quizMarks);
    }

    if (record.assignmentMarks?.length) {
      allAssignmentMarks.push(...record.assignmentMarks);
    }

    if (record.internalMarks !== null && record.internalMarks !== undefined) {
      internalMarksList.push(record.internalMarks);
    }
  }

  return {
    quizMarks: allQuizMarks,
    quizAverage: avg(allQuizMarks),
    assignmentMarks: allAssignmentMarks,
    assignmentAverage: avg(allAssignmentMarks),
    internalMarks: avg(internalMarksList),
  };
}

//  map riskProfiles array to { studentId → riskProfile } 
function createRiskMap(riskProfiles) {
  const map = {};
  for (const r of riskProfiles) {
    map[r.studentId.toString()] = r;
  }
  return map;
}

//  build one student analytics object 
// used by getClassDashboard + getDepartmentDashboard
function buildStudentAnalytics(student, risk) {
  return {
    studentId:            student._id,
    userName:             student.userName,
    PRN:                  student.PRN,
    classId:              student.classId ?? null,
    attendancePercentage: risk?.attendancePercentage ?? null,
    performanceScore:     risk?.performanceScore     ?? null,
    riskLevel:            risk?.riskLevel            ?? null,
    passProbability:      risk?.passProbability      ?? null,
    weakSubjects:         risk?.weakSubjects         ?? [],
    strongSubjects:       risk?.strongSubjects       ?? [],
    lastUpdated:          risk?.lastUpdated          ?? null,
  };
}

function buildDashboardStudent(student, risk) {
  return {
    studentId: student._id,
    userName: student.userName,
    PRN: student.PRN,

    attendancePercentage:
      risk?.attendancePercentage ?? null,

    performanceScore:
      risk?.performanceScore ?? null,

    riskLevel:
      risk?.riskLevel ?? null,
  };
}

//  build summary + filters from mapped student list 
// used by getClassDashboard + getDepartmentDashboard
function buildDashboardSummary(students) {
  const withRisk = students.filter((s) => s.riskLevel !== null);

  const highRisk   = withRisk.filter((s) => s.riskLevel === "HIGH");
  const mediumRisk = withRisk.filter((s) => s.riskLevel === "MEDIUM");
  const lowRisk    = withRisk.filter((s) => s.riskLevel === "LOW");
  const defaulters = withRisk.filter(
    (s) => s.attendancePercentage !== null && s.attendancePercentage < 75
  );

  const avgAttendance = withRisk.length
    ? parseFloat(
        (
          withRisk.reduce((acc, s) => acc + (s.attendancePercentage ?? 0), 0) /
          withRisk.length
        ).toFixed(2)
      )
    : null;

  const avgPerformance = withRisk.length
    ? parseFloat(
        (
          withRisk.reduce((acc, s) => acc + (s.performanceScore ?? 0), 0) /
          withRisk.length
        ).toFixed(2)
      )
    : null;

  return {
    summary: {
      totalStudents:      students.length,
      averageAttendance:  avgAttendance,
      averagePerformance: avgPerformance,
      highRiskCount:      highRisk.length,
      mediumRiskCount:    mediumRisk.length,
      lowRiskCount:       lowRisk.length,
      defaultersCount:    defaulters.length,
    },
    // only IDs in filters — frontend uses these to highlight from students array
    filters: {
      highRisk:   highRisk.map((s) => s.studentId),
      lowRisk: lowRisk.map(s => s.studentId),
      mediumRisk: mediumRisk.map((s) => s.studentId),
      defaulters: defaulters.map((s) => s.studentId),
    },
  };
}

async function getAvailableSubjects(
  classId,
  currentUser,
   isClassTeacher
) {
  let assignments;



  switch (currentUser.role) {
    case "TEACHER":
      if (isClassTeacher) {
        // Class Teacher can see all subjects in the class
        assignments = await TeacherSubject.find({
          classId,
          isActive: true,
        })
          .populate(
            "subjectId",
            "subjectName subjectCode"
          )
          .lean();
      } else {
        // Subject Teacher sees only assigned subjects
        assignments = await TeacherSubject.find({
          teacherId: currentUser._id,
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
      assignments = await TeacherSubject.find({
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

  // Remove duplicate subjects
  const subjectMap = new Map();

  for (const assignment of assignments) {
    const subject = assignment.subjectId;

    if (!subject) continue;

    subjectMap.set(subject._id.toString(), {
      subjectId: subject._id,
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode,
    });
  }

  return [...subjectMap.values()];
}

const buildSubjectInfo = (subjectAssignment) => ({
  subjectId: subjectAssignment.subjectId._id,
  subjectName: subjectAssignment.subjectId.subjectName,
  subjectCode: subjectAssignment.subjectId.subjectCode,
  teacher: {
    teacherId: subjectAssignment.teacherId._id,
    userName: subjectAssignment.teacherId.userName,
  },
});

module.exports = {
  avg,
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
  buildSubjectInfo
};