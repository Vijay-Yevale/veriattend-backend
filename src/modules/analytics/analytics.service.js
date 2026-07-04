const mongoose    = require("mongoose");
const AppError    = require("../../utils/AppError");
const Class       = require("../../models/class.model");
const User           = require("../../models/user.model");
const Session        = require("../../models/attendancesession.model");
const Record         = require("../../models/attendanceRecord.model");
const Department     = require("../../models/department.model");
const TeacherSubject = require("../../models/teacherSubject.model");
const AcademicRecord = require("../../models/academicRecord.model");
const RiskProfile    = require("../../models/riskProfile.model");

const {
 avg,
  classesNeededFor75,

  createRiskMap,

  computePerformanceScore,
  computeSubjectRisk,
   aggregateSubjectAttendance,
  classifySubjects,

  buildSubjectPerformance,

  buildStudentAnalytics,
  buildDashboardSummary,

  aggregateAcademicMarks,
  aggregateLiveAttendance,
} = require("./analytics.helper");




//  STUDENT: own dashboard 
const getStudentDashboard = async (studentId) => {
  const student = await User.findById(studentId).lean();
console.log("A");
  if (!student || student.role !== "STUDENT") {
    throw new AppError("Student not found", 404);
  }

  if (!student.classId) {
    throw new AppError("Student is not assigned to any class", 400);
  }

const [attendance, academicRecords, risk] = await Promise.all([
  aggregateLiveAttendance(studentId, student.classId),
  AcademicRecord.find({ studentId }).lean(),
  RiskProfile.findOne({ studentId })
    .populate(
      "weakSubjects.subjectId",
      "subjectName subjectCode"
    )
    .populate(
      "strongSubjects.subjectId",
      "subjectName subjectCode"
    )
    .lean(),
]);
console.log("B");

  const academic = aggregateAcademicMarks(academicRecords);
  console.log("C");

const response = {
  attendance: {
    attendancePercentage: attendance.attendancePercentage,
    totalClasses: attendance.totalClasses,
    totalAttended: attendance.totalAttended,
    classesMissed: attendance.classesMissed,
    classesNeededFor75: attendance.classesNeededFor75,
    subjectWise: attendance.subjectWise,
  },

  academicMarks: academic,

  risk: {
    performanceScore: risk?.performanceScore ?? null,
    riskLevel: risk?.riskLevel ?? null,
    riskScore: risk?.riskScore ?? null,
    passProbability: risk?.passProbability ?? null,
    weakSubjects: risk?.weakSubjects ?? [],
    strongSubjects: risk?.strongSubjects ?? [],
    
    lastUpdated: risk?.lastUpdated ?? null,
  },
};

console.log(JSON.stringify(response, null, 2));

return response;
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


// TEACHER: Subject-wise Student Analytics
// TEACHER: Subject-wise Student Analytics
const getStudentDetailForTeacher = async (studentId, teacherId) => {
  // Student
  const student = await User.findOne(
    {
      _id: studentId,
      role: "STUDENT",
    },
    {
      userName: 1,
      PRN: 1,
      classId: 1,
    }
  ).lean();

  if (!student) {
    throw new AppError("Student not found", 404);
  }

  // Teacher assignment
  const teacherSubject = await TeacherSubject.findOne({
    teacherId,
    classId: student.classId,
  })
    .populate("subjectId", "subjectName subjectCode")
    .select("subjectId")
    .lean();

  if (!teacherSubject) {
    throw new AppError(
      "You are not assigned to teach this student's class",
      403
    );
  }

  const subject = teacherSubject.subjectId;

  // Attendance for this subject
  const attendance = await aggregateSubjectAttendance(
    studentId,
    student.classId,
    subject._id
  );

  // Academic record for this subject
  const academicRecord = await AcademicRecord.findOne({
    studentId,
    classId: student.classId,
    subjectId: subject._id,
  }).lean();

  const quizAverage = avg(academicRecord?.quizMarks ?? []);
  const assignmentAverage = avg(
    academicRecord?.assignmentMarks ?? []
  );
  const internalMarks = academicRecord?.internalMarks ?? null;

  // Subject Performance
  // computePerformanceScore already treats null as 0 internally,
  // so we pass the raw (possibly null) values straight through.
  const performanceScore = computePerformanceScore({
    attendancePercentage: attendance.attendancePercentage,
    quizAverage,
    assignmentAverage,
    internalMarks,
  });

  // Subject Risk
  const riskLevel = computeSubjectRisk(performanceScore);

  return {
    studentId: student._id,
    userName: student.userName,
    PRN: student.PRN,

    subject: {
      subjectId: subject._id,
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode,

      attendance: {
        attendancePercentage: attendance.attendancePercentage,
        totalClasses: attendance.totalClasses,
        totalAttended: attendance.totalAttended,
        classesMissed: attendance.classesMissed,
        classesNeededFor75: attendance.classesNeededFor75,
      },

      academicMarks: {
        quizMarks: academicRecord?.quizMarks ?? [],
        quizAverage,

        assignmentMarks: academicRecord?.assignmentMarks ?? [],
        assignmentAverage,

        internalMarks,
      },

      risk: {
        performanceScore,
        riskLevel,
      },
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