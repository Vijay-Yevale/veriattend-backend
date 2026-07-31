const mongoose = require("mongoose"); 
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

  const department = await Department.create({
    name,
    code,
  });

  return department;
};

// CREATE HOD



const createHod = async ({
  userName,
  email,
  password,
  departmentId,
}) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const userExists = await User.findOne({
      email,
    }).session(session);

    if (userExists) {
      throw new AppError(
        "User already exists with this email",
        409
      );
    }

    const department =
      await Department.findById(
        departmentId
      ).session(session);

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

    const [createdUser] = await User.create(
      [
        {
          userName,
          email,
          password: hashedPassword,
          role: "HOD",
          departmentId,
        },
      ],
      { session }
    );

    await Department.findByIdAndUpdate(
      departmentId,
      {
        $set: {
          hodId: createdUser._id,
        },
      },
      { session }
    );

    await session.commitTransaction();

    // Populate department to match UserModel
    const user = await User.findById(
      createdUser._id
    )
      .populate(
        "departmentId",
        "name code"
      )
      .select("-password");

    return user;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
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

const createdTeacher = await User.findById(user._id)
  .populate("departmentId", "name code")
  .select("-password");

return createdTeacher;
};


// CREATE CLASS


const createClass = async (
  {
    className,
    academicYear,
    semester,
    classTeacherId,
  },
  hodUser
) => {
  const department = await Department.findById(
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
    departmentId: hodUser.departmentId,
    academicYear,
  });

  if (classExists) {
    throw new AppError(
      "Class already exists for this academic year",
      409
    );
  }

  if (classTeacherId) {
    const teacher = await User.findOne({
      _id: classTeacherId,
      role: "TEACHER",
      departmentId: hodUser.departmentId,
    });

    if (!teacher) {
      throw new AppError(
        "Teacher not found",
        404
      );
    }

    const teacherAlreadyAssigned =
      await Class.findOne({
        classTeacherId,
        academicYear,
      });

    if (teacherAlreadyAssigned) {
      throw new AppError(
        "Teacher is already assigned as a class teacher for this academic year",
        409
      );
    }
  }

  const createdClass = await Class.create({
    className,
    academicYear,
    semester,
    departmentId: hodUser.departmentId,
    classTeacherId: classTeacherId ?? null,
  });

  return await Class.findById(createdClass._id)
    .populate(
      "classTeacherId",
      "_id userName"
    )
    .select(
      "className departmentId academicYear semester classTeacherId"
    );
};

// CREATE SUBJECT


const createSubject = async (
  { subjectName, subjectCode, semester },
  hodUser
) => {
  const department = await Department.findById(
    hodUser.departmentId
  );

  if (!department) {
    throw new AppError(
      "Department not found",
      404
    );
  }

  const subjectExists = await Subject.findOne({
    subjectCode,
    departmentId: hodUser.departmentId,
  });

  if (subjectExists) {
    throw new AppError(
      "Subject code already exists in this department",
      409
    );
  }

  const createdSubject = await Subject.create({
    subjectName,
    subjectCode,
    semester,
    departmentId: hodUser.departmentId,
  });

  return await Subject.findById(createdSubject._id)
    .select("_id subjectName subjectCode semester");
};


// ASSIGN STUDENT TO CLASS


const bulkAssignClassToStudents = async ({ classId, studentIds }, hodUser) => {
  const classExists = await Class.findById(classId);

  if (!classExists) throw new AppError("Class not found", 404);

  if (classExists.departmentId.toString() !== hodUser.departmentId.toString()) {
    throw new AppError(
      "You can assign students only to your department classes",
      403
    );
  }

  await User.updateMany(
    {
      _id: { $in: studentIds },
      role: "STUDENT",
      departmentId: classExists.departmentId,
      classId: null,
    },
    { $set: { classId } }
  );
};


// ASSIGN TEACHER TO SUBJECT


const assignTeacherToSubject = async ({
  teacherId,
  subjectId,
  classId,
}) => {
  const teacher = await User.findById(teacherId);

  if (!teacher) {
    throw new AppError("Teacher not found", 404);
  }

  if (teacher.role !== "TEACHER") {
    throw new AppError("User is not a teacher", 400);
  }

  const subject = await Subject.findById(subjectId);

  if (!subject) {
    throw new AppError("Subject not found", 404);
  }

  const classDoc = await Class.findById(classId);

  if (!classDoc) {
    throw new AppError("Class not found", 404);
  }

  // Teacher may belong to any department
  // Supports minor subjects

  const alreadyAssigned = await TeacherSubject.findOne({
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

  await TeacherSubject.create({
    teacherId,
    subjectId,
    classId,
  });

  return null;
};


// GET ALL DEPARTMENTS


const getAllDepartments = async () => {
  return await Department.find()
    .select("name code")
    .sort({ createdAt: -1 });
};

// get deparment details


// GET TEACHERS


const getTeachers = async (hodUser) => {
  return await User.find({
    role: "TEACHER",
    departmentId: hodUser.departmentId,
  })
    .populate("departmentId", "name code")
    .select(
      "userName email role departmentId createdAt updatedAt"
    )
    .sort({ createdAt: -1 });
};

//
const getTeacherAssignments = async (hodUser) => {
  const assignments = await TeacherSubject.find()
    .populate("teacherId", "_id userName")
    .populate("subjectId", "_id subjectName subjectCode")
    .populate({
      path: "classId",
      match: {
        departmentId: hodUser.departmentId,
      },
      select: "_id className",
    })
    .sort({ createdAt: -1 });

  // Remove assignments whose class doesn't belong to this HOD's department
  // or where any populated reference is missing.
  return assignments.filter(
    (assignment) =>
      assignment.teacherId &&
      assignment.subjectId &&
      assignment.classId
  );
};

// GET CLASSES



const getClasses = async (hodUser) => {
  return await Class.find({
    departmentId: hodUser.departmentId,
  })
    .populate(
      "classTeacherId",
      "_id userName"
    )
    .select(
      "className departmentId academicYear semester classTeacherId"
    ).sort({ createdAt: -1 });;
};

// GET SUBJECTS


const getSubjects = async (hodUser) => {
  return await Subject.find({
    departmentId: hodUser.departmentId,
  })
    .select("_id subjectName subjectCode semester")
    .sort({ createdAt: -1 });
};

// GET PENDING STUDENTS


const getPendingStudents = async (hodUser) => {
  return await User.find({
    role: "STUDENT",
    classId: null,
    departmentId: hodUser.departmentId,
  })
   .select("_id userName email role PRN")
    .sort({ PRN: 1 });
};


// GET STUDENTS BY CLASS


const getStudentsByClass = async (classId) => {
  return await User.find({
    classId,
    role: "STUDENT",
  })
    .select("_id userName email role PRN")
    .sort({ PRN: 1 });
};


module.exports = {
  createDepartment,
  createHod,
  createTeacher,
  createClass,
  createSubject,
  bulkAssignClassToStudents,
  assignTeacherToSubject,

  getAllDepartments,
 
  getTeachers,
  getClasses,
  getSubjects,
  getTeacherAssignments,
  getPendingStudents,
  getStudentsByClass,
};