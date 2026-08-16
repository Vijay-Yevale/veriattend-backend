const AcademicRecord = require("../../models/academicRecord.model");
const User = require("../../models/user.model");
const TeacherSubject = require("../../models/teachersubject.model");
const AppError = require("../../utils/AppError");

//  internal helper
function _upsertBase(studentId, subjectId, classId, teacherId) {
  return {
    filter: { studentId, subjectId, classId },
    options: {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
    },
    setOnInsert: { teacherId },
  };
}

//  verify teacher is assigned to this subject+class
async function _verifyTeacherOwnership(teacherId, subjectId, classId) {
  const assignment = await TeacherSubject.findOne({
    teacherId,
    subjectId,
    classId,
    isActive: true,
  }).lean();

  if (!assignment) {
    throw new AppError(
      "You are not assigned to this subject for this class",
      403
    );
  }
}

//  verify single student belongs to class 
async function _verifyStudentInClass(studentId, classId) {
  const student = await User.findOne({
    _id: studentId,
    classId: classId,
    role: "STUDENT",
  }).lean();

  if (!student) {
    throw new AppError("Student does not belong to this class", 400);
  }
}

//  utility 
function avg(arr) {
  if (!arr || arr.length === 0) return null;

  return Number(
    (arr.reduce((sum, value) => sum + value, 0) / arr.length).toFixed(2)
  );
}

//  add one quiz mark 
const addQuizMark = async (studentId, subjectId, classId, mark, teacherId) => {
  await _verifyTeacherOwnership(teacherId, subjectId, classId);
  await _verifyStudentInClass(studentId, classId);

  const { filter, options, setOnInsert } = _upsertBase(
    studentId,
    subjectId,
    classId,
    teacherId
  );

  const record = await AcademicRecord.findOneAndUpdate(
    filter,
    {
      $push: { quizMarks: mark },
      $setOnInsert: setOnInsert,
    },
    options
  );

  if (!record) {
    throw new AppError("Failed to add quiz mark", 500);
  }

  return record;
};

//  add one assignment mark
const addAssignmentMark = async (
  studentId,
  subjectId,
  classId,
  mark,
  teacherId
) => {
  await _verifyTeacherOwnership(teacherId, subjectId, classId);
  await _verifyStudentInClass(studentId, classId);

  const { filter, options, setOnInsert } = _upsertBase(
    studentId,
    subjectId,
    classId,
    teacherId
  );

  const record = await AcademicRecord.findOneAndUpdate(
    filter,
    {
      $push: { assignmentMarks: mark },
      $setOnInsert: setOnInsert,
    },
    options
  );

  if (!record) {
    throw new AppError("Failed to add assignment mark", 500);
  }

  return record;
};

//  set (overwrite) internal marks 
const setInternalMarks = async (
  studentId,
  subjectId,
  classId,
  internalMarks,
  teacherId
) => {
  await _verifyTeacherOwnership(teacherId, subjectId, classId);
  await _verifyStudentInClass(studentId, classId);

  const { filter, options, setOnInsert } = _upsertBase(
    studentId,
    subjectId,
    classId,
    teacherId
  );

  const record = await AcademicRecord.findOneAndUpdate(
    filter,
    {
      $set: { internalMarks },
      $setOnInsert: setOnInsert,
    },
    options
  );

  if (!record) {
    throw new AppError("Failed to update internal marks", 500);
  }

  return record;
};

//  bulk submit (quiz / assignment / internal) for entire class 
const bulkSubmitMarks = async (
  subjectId,
  classId,
  type,
  records,
  teacherId
) => {
  // verify teacher owns this subject+class before anything else
  await _verifyTeacherOwnership(teacherId, subjectId, classId);

  // find which studentIds actually belong to this class
  const studentIds = records.map((r) => r.studentId);

  const validStudents = await User.find(
    { _id: { $in: studentIds }, classId: classId, role: "STUDENT" },
    { _id: 1 }
  ).lean();

  const validIds = new Set(validStudents.map((s) => s._id.toString()));

  const results = { updated: [], failed: [] };

  // push invalid students directly to failed — skip DB write
  for (const { studentId } of records) {
    if (!validIds.has(studentId.toString())) {
      results.failed.push({
        studentId,
        reason: "Student does not belong to this class",
      });
    }
  }

  // only process valid students
  const validRecords = records.filter((r) =>
    validIds.has(r.studentId.toString())
  );

  for (const { studentId, mark } of validRecords) {
    try {
      const { filter, options, setOnInsert } = _upsertBase(
        studentId,
        subjectId,
        classId,
        teacherId
      );

      let updatePayload;

      if (type === "quiz") {
        updatePayload = {
          $push: { quizMarks: mark },
          $setOnInsert: setOnInsert,
        };
      } else if (type === "assignment") {
        updatePayload = {
          $push: { assignmentMarks: mark },
          $setOnInsert: setOnInsert,
        };
      } else {
        // internal — overwrite
        updatePayload = {
          $set: { internalMarks: mark },
          $setOnInsert: setOnInsert,
        };
      }

      const record = await AcademicRecord.findOneAndUpdate(
        filter,
        updatePayload,
        options
      );

      if (!record) {
        results.failed.push({
          studentId,
          reason: "Failed to update marks",
        });
        continue;
      }

      results.updated.push(studentId);
    } catch (err) {
      results.failed.push({
        studentId,
        reason: err.message,
      });
    }
  }

  if (!results.updated.length) {
    throw new AppError("No valid students to update marks", 400);
  }

  return results;
};

//  full class roster for the "Manage Marks" screen — every student in
//  the class, with empty arrays / null marks where nothing entered yet
const getClassRosterForMarks = async (subjectId, classId, teacherId) => {
  await _verifyTeacherOwnership(teacherId, subjectId, classId);

  const students = await User.find(
    { classId, role: "STUDENT" },
    { userName: 1, PRN: 1 }
  )
    .sort({ userName: 1 })
    .lean();

  if (!students.length) {
    throw new AppError("No students found in this class", 404);
  }

  const records = await AcademicRecord.find({ subjectId, classId }).lean();

  const recordsByStudentId = new Map(
    records.map((record) => [record.studentId.toString(), record])
  );

  return students.map((student) => {
    const record = recordsByStudentId.get(student._id.toString());

    return {
      studentId: student._id,
      userName: student.userName,
      PRN: student.PRN,
      quizMarks: record?.quizMarks ?? [],
assignmentMarks: record?.assignmentMarks ?? [],
internalMarks: record?.internalMarks ?? null,
quizAverage: avg(record?.quizMarks),
assignmentAverage: avg(record?.assignmentMarks),
    };
  });
};

//  get all students' marks for a subject+class (teacher view) 
const getClassMarks = async (subjectId, classId) => {
  const records = await AcademicRecord.find({ subjectId, classId })
    .populate("studentId", "userName PRN")
    .sort({ createdAt: -1 });

  if (!records.length) {
    throw new AppError("No records found", 404);
  }

  return records.map((record) => ({
    studentId: record.studentId._id,
    userName: record.studentId.userName,
    PRN: record.studentId.PRN,
    quizMarks: record.quizMarks,
    quizAverage: avg(record.quizMarks),
    assignmentMarks: record.assignmentMarks,
    assignmentAverage: avg(record.assignmentMarks),
    internalMarks: record.internalMarks,
  }));
};

//  get one student's marks across all subjects 
const getStudentMarks = async (studentId) => {
  const records = await AcademicRecord.find({ studentId })
    .populate("subjectId", "subjectName subjectCode")
    .sort({ createdAt: -1 });

  if (!records.length) {
    throw new AppError("No records found", 404);
  }

  return records.map((record) => ({
    subjectId: record.subjectId._id,
    subjectName: record.subjectId.subjectName,
    subjectCode: record.subjectId.subjectCode,
    quizMarks: record.quizMarks,
    quizAverage: avg(record.quizMarks),
    assignmentMarks: record.assignmentMarks,
    assignmentAverage: avg(record.assignmentMarks),
    internalMarks: record.internalMarks,
  }));
};

module.exports = {
  addQuizMark,
  addAssignmentMark,
  setInternalMarks,
  bulkSubmitMarks,
  getClassRosterForMarks,
  getClassMarks,
  getStudentMarks,
};