const mongoose = require("mongoose");
const AppError = require("../../utils/AppError");
const Class = require("../../models/class.model");
const Subject = require("../../models/subject.model");
const User = require("../../models/user.model");
const Session = require("../../models/attendancesession.model");
const Record = require("../../models/attendanceRecord.model");
const Department = require("../../models/department.model");
const TeacherSubject = require("../../models/teacherSubject.model");
const AcademicRecord = require("../../models/academicRecord.model");
const RiskProfile = require("../../models/riskProfile.model");

const {
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
} = require("./analytics.helper");




//  STUDENT: own dashboard 
const getStudentDashboard = async (studentId) => {
  const student = await User.findById(studentId).lean();
  console.log("A");

  if (!student || student.role !== "STUDENT") {
    throw new AppError("Student not found", 404);
  }

  // Student registered but HOD hasn't assigned a class yet.
  if (!student.classId) {
    return {
      attendance: {
        attendancePercentage: 0,
        totalClasses: 0,
        totalAttended: 0,
        classesMissed: 0,
        classesNeededFor75: 0,
        subjectWise: [],
      },

      academicMarks: null,

      risk: {
        performanceScore: null,
        riskLevel: null,
        riskScore: null,
        passProbability: null,
        weakSubjects: [],
        strongSubjects: [],
        lastUpdated: null,
      },
    };
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
// TEACHER / HOD / SUPER_ADMIN : Class Dashboard

const getClassDashboard = async (classId, currentUser, subjectId = null) => {

  // Validate Class
  const classData = await Class.findById(
    classId,
    "departmentId classTeacherId className"
  ).lean();

  if (!classData) {
    throw new AppError("Class doesn't exist", 404);
  }

  // Resolve subject assignment once (used for validation + final response)
  let subjectAssignment = null;

  if (subjectId) {
    subjectAssignment = await TeacherSubject.findOne({
      classId,
      subjectId,
      isActive: true,
    })
      .populate("subjectId", "subjectName subjectCode")
      .populate("teacherId", "_id userName")
      .lean();

    if (!subjectAssignment) {
      throw new AppError("Subject not found for this class", 404);
    }
  }

  const isClassTeacher =
    currentUser.role === "TEACHER" &&
    classData.classTeacherId &&
    classData.classTeacherId.toString() === currentUser._id.toString();

  // Authorization
  switch (currentUser.role) {

    case "TEACHER": {
      if (isClassTeacher) break;

      const assignment = await TeacherSubject.exists({
        teacherId: currentUser._id,
        classId,
        ...(subjectId && { subjectId }),
        isActive: true,
      });

      if (!assignment) {
        throw new AppError("You are not authorized to access this analytics", 403);
      }
      break;
    }

    case "HOD": {
      if (
        classData.departmentId.toString() !== currentUser.departmentId.toString()
      ) {
        throw new AppError("You are not authorized to access this class", 403);
      }
      break;
    }

    case "SUPER_ADMIN":
      break;

    default:
      throw new AppError("Unauthorized", 403);
  }

  // Fetch Students
  const students = await User.find(
    { classId, role: "STUDENT" },
    { _id: 1, userName: 1, PRN: 1, classId: 1 }
  ).lean();

  if (!students.length) {
    if (!subjectId) {
      const subjects = await getAvailableSubjects(classId, currentUser, isClassTeacher);

      return {
        classId,
        className: classData.className,
        summary: {
          totalStudents: 0,
          averageAttendance: 0,
          highRiskStudents: 0,
          defaulters: 0,
        },
        students: [],
        filters: {
          highRisk: [],
          mediumRisk: [],
          lowRisk: [],
          defaulters: [],
        },
        availableSubjects: subjects,
      };
    }

    return {
      classId,
      className: classData.className,
      attendanceStarted: false,
      subject: buildSubjectInfo(subjectAssignment),
      summary: null,
      students: [],
      filters: null,
    };
  }

  // ===========================
  // OVERALL CLASS DASHBOARD
  // ===========================
  if (!subjectId) {
    const studentIds = students.map((student) => student._id);

    const [riskProfiles, subjects] = await Promise.all([
      RiskProfile.find({ studentId: { $in: studentIds } }).lean(),
      getAvailableSubjects(classId, currentUser, isClassTeacher),
    ]);

    const riskMap = createRiskMap(riskProfiles);

    const studentList = students.map((student) =>
      buildDashboardStudent(student, riskMap[student._id.toString()])
    );

    const { summary, filters } = buildDashboardSummary(studentList);

    return {
      classId,
      className: classData.className,
      summary,
      students: studentList,
      filters,
      availableSubjects: subjects,
    };
  }

  // ===========================
  // SUBJECT DASHBOARD
  // ===========================
  const [{ totalClasses, attendanceMap }, academicRecords] = await Promise.all([
    aggregateSubjectAttendanceForClass(classId, subjectId),
    AcademicRecord.find({ classId, subjectId }).lean(),
  ]);

  const attendanceStarted = totalClasses > 0;

  if (!attendanceStarted) {
    return {
      classId,
      className: classData.className,
      attendanceStarted,
      subject: buildSubjectInfo(subjectAssignment),
      summary: null,
      students: [],
      filters: null,
    };
  }

  const academicMap = Object.create(null);
  for (const record of academicRecords) {
    academicMap[record.studentId.toString()] = record;
  }

  const subjectStudents = students.map((student) => {
    const attendance =
      attendanceMap[student._id.toString()] ?? {
        subjectId,
        attendancePercentage: 0,
        totalClasses,
        totalAttended: 0,
        classesMissed: totalClasses,
        classesNeededFor75: classesNeededFor75(0, totalClasses),
      };

    const academic = academicMap[student._id.toString()] ?? null;

    const performance = buildSubjectPerformance({ attendance, academic });

    return {
      studentId: student._id,
      userName: student.userName,
      PRN: student.PRN,
      attendancePercentage: performance.attendancePercentage,
      performanceScore: performance.performanceScore,
      riskLevel: performance.riskLevel,
    };
  });

  const { summary, filters } = buildDashboardSummary(subjectStudents);

  return {
    classId,
    className: classData.className,
    attendanceStarted,
    subject: buildSubjectInfo(subjectAssignment),
    summary,
    students: subjectStudents,
    filters,
  };
};



//  TEACHER: one student detail 


const getStudentSubjectDetail = async (
  studentId,
  subjectId,
  currentUser
) => {
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

  // Fetch class and validate subject simultaneously
  const [classData, subjectAssignment] = await Promise.all([
    Class.findById(
      student.classId,
      "departmentId classTeacherId"
    ).lean(),

    TeacherSubject.findOne({
      classId: student.classId,
      subjectId,
      isActive: true,
    })
      .populate("subjectId", "subjectName subjectCode")
      .lean()
  ]);

  if (!classData) {
    throw new AppError("Class not found", 404);
  }

  if (!subjectAssignment) {
    throw new AppError(
      "Subject not found for this class",
      404
    );
  }

  // Authorization
  switch (currentUser.role) {
    case "TEACHER": {
      const isClassTeacher =
        classData.classTeacherId &&
        classData.classTeacherId.toString() ===
        currentUser._id.toString();

      if (!isClassTeacher) {
        const assignment =
          await TeacherSubject.exists({
            teacherId: currentUser._id,
            classId: student.classId,
            subjectId,
            isActive: true,
          });

        if (!assignment) {
          throw new AppError(
            "You are not authorized to view this subject analytics",
            403
          );
        }
      }

      break;
    }

    case "HOD": {
      if (
        classData.departmentId.toString() !==
        currentUser.departmentId.toString()
      ) {
        throw new AppError(
          "You are not authorized to access this student",
          403
        );
      }

      break;
    }

    case "SUPER_ADMIN":
      break;

    default:
      throw new AppError("Unauthorized", 403);
  }

  const subject = subjectAssignment.subjectId;

  // Attendance & Academic Record
  const [attendance, academicRecord] =
    await Promise.all([
      aggregateSubjectAttendance(
        studentId,
        student.classId,
        subjectId
      ),

      AcademicRecord.findOne({
        studentId,
        classId: student.classId,
        subjectId,
      }).lean(),
    ]);

  const quizAverage = avg(
    academicRecord?.quizMarks ?? []
  );

  const assignmentAverage = avg(
    academicRecord?.assignmentMarks ?? []
  );

  const internalMarks =
    academicRecord?.internalMarks ?? null;

  const performanceScore =
    computePerformanceScore({
      attendancePercentage:
        attendance.attendancePercentage,
      quizAverage,
      assignmentAverage,
      internalMarks,
    });

  const riskLevel =
    computeSubjectRisk(performanceScore);

  return {
    studentId: student._id,
    userName: student.userName,
    PRN: student.PRN,

    subject: {
      subjectId: subject._id,
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode,

      attendance: {
        attendancePercentage:
          attendance.attendancePercentage,
        totalClasses: attendance.totalClasses,
        totalAttended: attendance.totalAttended,
        classesMissed: attendance.classesMissed,
        classesNeededFor75:
          attendance.classesNeededFor75,
      },

      academicMarks: {
        quizMarks:
          academicRecord?.quizMarks ?? [],
        quizAverage,

        assignmentMarks:
          academicRecord?.assignmentMarks ?? [],
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
const getDepartmentAnalytics = async (
  departmentId,
  currentUser
) => {
  // Resolve department based on role
  switch (currentUser.role) {
    case "HOD":
      departmentId = currentUser.departmentId;
      break;

    case "SUPER_ADMIN":
      if (!departmentId) {
        throw new AppError("Department is required", 400);
      }
      break;

    default:
      throw new AppError("Unauthorized", 403);
  }

  // Validate Department
  const department = await Department.findById(
    departmentId,
    "name"
  ).lean();

  if (!department) {
    throw new AppError("Department doesn't exist", 404);
  }

  const [
    totalStudents,
    totalTeachers,
    totalClasses,
    totalSubjects,
    classes,
  ] = await Promise.all([
    User.countDocuments({
      departmentId,
      role: "STUDENT",
      classId: { $ne: null },
    }),

    User.countDocuments({
      departmentId,
      role: "TEACHER",
    }),

    Class.countDocuments({
      departmentId,
    }),

    Subject.countDocuments({
      departmentId,
    }),

    Class.find(
      { departmentId },
      {
        className: 1,
        classTeacherId: 1,
      }
    )
      .populate("classTeacherId", "_id userName")
      .sort({ className: 1 })
      .lean(),
  ]);

  return {
    departmentId: department._id.toString(),
    departmentName: department.name,

    summary: {
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
    },

    classes: classes.map((cls) => ({
      classId: cls._id.toString(),
      className: cls.className,

      classTeacher: cls.classTeacherId
        ? {
            teacherId: cls.classTeacherId._id.toString(),
            userName: cls.classTeacherId.userName,
          }
        : null,
    })),
  };
};

module.exports = {
  getStudentDashboard,
  getClassDashboard,
  getStudentSubjectDetail,

  getDepartmentAnalytics,
};