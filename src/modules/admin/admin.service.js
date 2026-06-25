const User = require("../../models/user.model");
const Class = require("../../models/class.model");
const Department = require("../../models/department.model");
const Subject = require("../../models/subject.model");
const TeacherSubject = require("../../models/teachersubject.model");

const AppError = require("../../utils/AppError");
const bcrypt = require("bcryptjs");


// CREATE DEPARTMENT


const createDepartment = async ({ name, code }) => {
  const nameExists = await Department.findOne({ name });

  if (nameExists) {
    throw new AppError(
      "Department with this name already exists",
      409
    );
  }

  const codeExists = await Department.findOne({ code });

  if (codeExists) {
    throw new AppError(
      "Department with this code already exists",
      409
    );
  }

  return await Department.create({name, code});
};


// CREATE HOD


const createHod = async ({userName,email,password, departmentId}) => {
  const userExists = await User.findOne({ email });

  if (userExists) {
    throw new AppError(
      "User already exists with this email",
      409
    );
  }

  const department =
    await Department.findById(departmentId);

  if (!department) {
    throw new AppError(
      "Department not found",
      404
    );
  }

  if (department.hodId) {
    throw new AppError(
      "This department already has a HOD assigned",
      409
    );
  }

  const hashedPassword =
    await bcrypt.hash(password, 10);

  const user = await User.create({userName,email,password: hashedPassword,role: "HOD",departmentId});

  await Department.findByIdAndUpdate(
    departmentId,
    {
      $set: {
        hodId: user._id,
      },
    }
  );

  user.password = undefined;

  return user;
};


// CREATE TEACHER


const createTeacher = async (
  { userName, email, password },
  hodUser
) => {
  const userExists = await User.findOne({ email });

  if (userExists) {
    throw new AppError(
      "User already exists with this email",
      409
    );
  }

  const hashedPassword =
    await bcrypt.hash(password, 10);

  const user = await User.create({
    userName,
    email,
    password: hashedPassword,
    role: "TEACHER",
    departmentId: hodUser.departmentId,
  });

  user.password = undefined;

  return user;
};


// CREATE CLASS


const createClass = async (
  {
    className,
    academicYear,
    semester,
  },
  hodUser
) => {
  const department =
    await Department.findById(
      hodUser.departmentId
    );

  if (!department) {
    throw new AppError(
      "Department not found",
      404
    );
  }

  const classExists = await Class.findOne({
    className,
    departmentId:
      hodUser.departmentId,
    academicYear,
  });

  if (classExists) {
    throw new AppError(
      "Class already exists for this academic year",
      409
    );
  }

  return await Class.create({
    className,academicYear,
    semester,departmentId:hodUser.departmentId
  });
};


// CREATE SUBJECT


const createSubject = async ({subjectName,subjectCode,semester}, hodUser) => {
  const department =
    await Department.findById(
      hodUser.departmentId
    );

  if (!department) {
    throw new AppError(
      "Department not found",
      404
    );
  }

  const subjectExists =
    await Subject.findOne({
      subjectCode,
      departmentId:
        hodUser.departmentId,
    });

  if (subjectExists) {
    throw new AppError(
      "Subject code already exists in this department",
      409
    );
  }

  return await Subject.create({
    subjectName,
    subjectCode,
    semester,
    departmentId:
      hodUser.departmentId,
  });
};


// ASSIGN STUDENT TO CLASS


const assignClassToStudent = async (
  { classId, studentId },
  hodUser
) => {
  const student =
    await User.findById(studentId);

  if (!student) {
    throw new AppError(
      "Student not found",
      404
    );
  }

  if (student.role !== "STUDENT") {
    throw new AppError(
      "User is not a student",
      400
    );
  }

  const classExists =
    await Class.findById(classId);

  if (!classExists) {
    throw new AppError(
      "Class not found",
      404
    );
  }

  // HOD can manage only own department

  if (
    classExists.departmentId.toString() !==
    hodUser.departmentId.toString()
  ) {
    throw new AppError(
      "You can assign students only to your department classes",
      403
    );
  }

  if (
    student.departmentId.toString() !==
    classExists.departmentId.toString()
  ) {
    throw new AppError(
      "Student and class belong to different departments",
      400
    );
  }

  if (student.classId) {
    throw new AppError(
      "Student is already assigned to a class",
      409
    );
  }

  const updatedStudent =
    await User.findByIdAndUpdate(
      studentId,
      {
        $set: {
          classId,
        },
      },
      {
        new: true,
      }
    );

  updatedStudent.password =
    undefined;

  return updatedStudent;
};


// ASSIGN TEACHER TO SUBJECT


const assignTeacherToSubject = async ({
  teacherId,
  subjectId,
  classId,
}) => {
  const teacher =
    await User.findById(teacherId);

  if (!teacher) {
    throw new AppError(
      "Teacher not found",
      404
    );
  }

  if (teacher.role !== "TEACHER") {
    throw new AppError(
      "User is not a teacher",
      400
    );
  }

  const subject =
    await Subject.findById(subjectId);

  if (!subject) {
    throw new AppError(
      "Subject not found",
      404
    );
  }

  const classDoc =
    await Class.findById(classId);

  if (!classDoc) {
    throw new AppError(
      "Class not found",
      404
    );
  }

  // Teacher may belong to any department
  // Supports minor subjects

  const alreadyAssigned =
    await TeacherSubject.findOne({
      teacherId,
      subjectId,
      classId,
    });

  if (alreadyAssigned) {
    throw new AppError(
      "Teacher already assigned to this subject and class",
      409
    );
  }

  return await TeacherSubject.create({
    teacherId,
    subjectId,
    classId,
  });
};


// GET ALL DEPARTMENTS


const getAllDepartments = async () => {
  const departments =
    await Department.find()
      .select("name code");

  if (!departments.length) {
    throw new AppError(
      "No departments found",
      404
    );
  }

  return departments;
};


// GET TEACHERS


const getTeachers = async (
  hodUser
) => {
  const teachers =
    await User.find({
      role: "TEACHER",
      departmentId:
        hodUser.departmentId,
    }).select(
      "userName email"
    );

  if (!teachers.length) {
    throw new AppError(
      "No teachers found",
      404
    );
  }

  return teachers;
};


// GET CLASSES


const getClasses = async (
  hodUser
) => {
  const classes =
    await Class.find({
      departmentId:
        hodUser.departmentId,
    })
      .select(
        "className academicYear semester"
      )
      .populate(
        "departmentId",
        "name code"
      );

  if (!classes.length) {
    throw new AppError(
      "No classes found",
      404
    );
  }

  return classes;
};

// GET SUBJECTS


const getSubjects = async (
  hodUser
) => {
  const subjects =
    await Subject.find({
      departmentId:
        hodUser.departmentId,
    })
      .select(
        "subjectName subjectCode semester"
      )
      .populate(
        "departmentId",
        "name code"
      );

  if (!subjects.length) {
    throw new AppError(
      "No subjects found",
      404
    );
  }

  return subjects;
};


// GET PENDING STUDENTS


const getPendingStudents =
  async (hodUser) => {
    const students =
      await User.find({
        role: "STUDENT",
        classId: null,
        departmentId:
          hodUser.departmentId,
      }).select(
        "userName email PRN createdAt"
      );

    if (!students.length) {
      throw new AppError(
        "No pending students found",
        404
      );
    }

    return students;
  };


// GET STUDENTS BY CLASS


const getStudentsByClass =
  async (classId) => {
    const students =
      await User.find({
        classId,
        role: "STUDENT",
      })
        .select(
          "userName email PRN"
        )
        .populate(
          "classId",
          "className academicYear semester"
        );

    if (!students.length) {
      throw new AppError(
        "No students found",
        404
      );
    }

    return students;
  };

module.exports = {
  createDepartment,
  createHod,
  createTeacher,
  createClass,
  createSubject,
  assignClassToStudent,
  assignTeacherToSubject,

  getAllDepartments,
  getTeachers,
  getClasses,
  getSubjects,
  getPendingStudents,
  getStudentsByClass,
};