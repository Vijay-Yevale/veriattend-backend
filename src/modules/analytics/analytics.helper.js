const mongoose = require("mongoose");
const Session = require("../../models/attendancesession.model");
const Record = require("../../models/attendanceRecord.model");


//  constants 
const WEAK_SUBJECT_THRESHOLD   = 75;
const STRONG_SUBJECT_THRESHOLD = 85;

// ── pure utility functions ────────────────────────────────────────────────────

function avg(arr) {
  if (!arr || arr.length === 0) return null;
  return parseFloat(
    (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2)
  );
}

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
  if (!records || !records.length) return null;

  const allQuizMarks       = [];
  const allAssignmentMarks = [];
  const internalMarksList  = [];

  for (const record of records) {
    if (record.quizMarks?.length) allQuizMarks.push(...record.quizMarks);
    if (record.assignmentMarks?.length) allAssignmentMarks.push(...record.assignmentMarks);
    if (record.internalMarks !== null && record.internalMarks !== undefined) {
      internalMarksList.push(record.internalMarks);
    }
  }

  return {
    quizMarks:         allQuizMarks,
    quizAverage:       avg(allQuizMarks),
    assignmentMarks:   allAssignmentMarks,
    assignmentAverage: avg(allAssignmentMarks),
    internalMarks:     avg(internalMarksList),
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
      mediumRisk: mediumRisk.map((s) => s.studentId),
      defaulters: defaulters.map((s) => s.studentId),
    },
  };
}

module.exports = {
  avg,
  classesNeededFor75,
  createRiskMap,
  classifySubjects,
  computePerformanceScore,
  buildStudentAnalytics,
  buildDashboardSummary,
  aggregateAcademicMarks,
  aggregateLiveAttendance
};