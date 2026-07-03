const mongoose    = require("mongoose");
const AppError    = require("../../utils/AppError");
const Class       = require("../../models/class.model");
const User           = require("../../models/user.model");
const Session        = require("../../models/attendancesession.model");
const Record         = require("../../models/attendanceRecord.model");
const Department     = require("../../models/department.model");
const AcademicRecord = require("../../models/academicRecord.model");
const RiskProfile    = require("../../models/riskProfile.model");

const {
  classesNeededFor75,
  createRiskMap,
  buildStudentAnalytics,
  buildDashboardSummary,
  aggregateAcademicMarks,
} = require("./analytics.helper");
const { getDepartmentAnalytics } = require("./analytics.controller");

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

//  STUDENT: own dashboard 
const getStudentDashboard = async (studentId) => {
  const student = await User.findById(studentId).lean();

  if (!student || student.role !== "STUDENT") {
    throw new AppError("Student not found", 404);
  }

  if (!student.classId) {
    throw new AppError("Student is not assigned to any class", 400);
  }

  const [attendance, academicRecords, risk] = await Promise.all([
    aggregateLiveAttendance(studentId, student.classId),
    AcademicRecord.find({ studentId }).lean(),
    RiskProfile.findOne({ studentId }).lean(),
  ]);

  const academic = aggregateAcademicMarks(academicRecords);

  return {
    // live attendance — fresh on every request
    attendance: {
      attendancePercentage: attendance.attendancePercentage,
      totalClasses:         attendance.totalClasses,
      totalAttended:        attendance.totalAttended,
      classesMissed:        attendance.classesMissed,
      classesNeededFor75:   attendance.classesNeededFor75,
      subjectWise:          attendance.subjectWise,
    },

    // academic marks — aggregated across every subject's AcademicRecord
    academicMarks: academic,

    // risk — from last cron run (every 7 hrs)
    risk: {
      performanceScore: risk?.performanceScore ?? null,
      riskLevel:        risk?.riskLevel        ?? null,
      riskScore:        risk?.riskScore        ?? null,
      passProbability:  risk?.passProbability  ?? null,
      weakSubjects:     risk?.weakSubjects     ?? [],
      strongSubjects:   risk?.strongSubjects   ?? [],
      predictedBy:      risk?.predictedBy      ?? null,
      lastUpdated:      risk?.lastUpdated      ?? null,
    },
  };
};

//  TEACHER: class dashboard 
const getClassDashboard = async (classId) => {
const classExists = await Class.findById(classId);
if(!classExists){
  throw new AppError("class doesn't exists",404);
}
  const students = await User.find(
    { classId, role: "STUDENT" },
    { _id: 1, userName: 1, PRN: 1,classId:1 }
  ).lean();

  if (!students.length) {
    throw new AppError("No students found in this class", 404);
  }

  const studentIds   = students.map((s) => s._id);
  const riskProfiles = await RiskProfile.find(
    { studentId: { $in: studentIds } }
  ).lean();

  const riskMap      = createRiskMap(riskProfiles);
  const studentList  = students.map((s) =>
    buildStudentAnalytics(s, riskMap[s._id.toString()])
  );

  const { summary, filters } = buildDashboardSummary(studentList);

  return { summary, students: studentList, filters };
};

//  TEACHER: one student detail 
const getStudentDetailForTeacher = async (studentId) => {
  const student = await User.findOne(
    { _id: studentId, role: "STUDENT" },
    { userName: 1, PRN: 1, classId: 1 }
  ).lean();

  if (!student) {
    throw new AppError("Student not found", 404);
  }

  const [attendance, academicRecords, risk] = await Promise.all([
    aggregateLiveAttendance(studentId, student.classId),
    AcademicRecord.find({ studentId }).lean(),
    RiskProfile.findOne({ studentId }).lean(),
  ]);

  const academic = aggregateAcademicMarks(academicRecords);

  return {
    studentId: studentId,
    userName:  student.userName,
    PRN:       student.PRN,

    attendance: {
      attendancePercentage: attendance.attendancePercentage,
      totalClasses:         attendance.totalClasses,
      totalAttended:        attendance.totalAttended,
      classesMissed:        attendance.classesMissed,
      subjectWise:          attendance.subjectWise,
    },

    academicMarks: academic,

    risk: {
      performanceScore: risk?.performanceScore ?? null,
      riskLevel:        risk?.riskLevel        ?? null,
      passProbability:  risk?.passProbability  ?? null,
      weakSubjects:     risk?.weakSubjects     ?? [],
      strongSubjects:   risk?.strongSubjects   ?? [],
      lastUpdated:      risk?.lastUpdated      ?? null,
    },
  };
};

//  HOD: department dashboard 
const getDepartmentAnalytics = async (departmentId) => {
  const department = await Department.findById(departmentId);
  if(!department){
    throw new AppError("Department doesn't exists",404);
  }
  const students = await User.find(
    { departmentId, role: "STUDENT", classId: { $ne: null } },
    { _id: 1, userName: 1, PRN: 1, classId: 1 }
  ).lean();

  if (!students.length) {
    throw new AppError("No students found in this department", 404);
  }

  const studentIds   = students.map((s) => s._id);
  const riskProfiles = await RiskProfile.find(
    { studentId: { $in: studentIds } }
  ).lean();

  const riskMap     = createRiskMap(riskProfiles);
  const studentList = students.map((s) =>
    buildStudentAnalytics(s, riskMap[s._id.toString()])
  );

  const { summary, filters } = buildDashboardSummary(studentList);

  return { summary, students: studentList, filters };
};

module.exports = {
  getStudentDashboard,
  getClassDashboard,
  getStudentDetailForTeacher,
  getDepartmentAnalytics,
};