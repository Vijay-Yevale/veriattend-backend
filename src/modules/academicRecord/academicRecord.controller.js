const catchAsync = require("../../utils/catchAsync");
const sendResponse = require("../../utils/response.util");
const {
  addQuizMark,
  addAssignmentMark,
  setInternalMarks,
  bulkSubmitMarks,
  getClassMarks,
  getStudentMarks,
} = require("../academicRecord/academicRecord.service");

//  add quiz marks
const addQuizMarkController = catchAsync(async (req, res) => {
  const { studentId, subjectId, classId, mark } = req.body;
  const teacherId = req.user._id;

  const record = await addQuizMark(studentId, subjectId, classId, mark, teacherId);

  sendResponse(res, 200, "Quiz mark added", {
    studentId: record.studentId,
    subjectId: record.subjectId,
    quizMarks: record.quizMarks,
  });
});

// add assignment marks
const addAssignmentMarkController = catchAsync(async (req, res) => {
  const { studentId, subjectId, classId, mark } = req.body;
  const teacherId = req.user._id;

  const record = await addAssignmentMark(studentId, subjectId, classId, mark, teacherId);

  sendResponse(res, 200, "Assignment mark added", {
    studentId: record.studentId,
    subjectId: record.subjectId,
    assignmentMarks: record.assignmentMarks,
  });
});

// add internal marks
const setInternalMarksController = catchAsync(async (req, res) => {
  const { studentId, subjectId, classId, internalMarks } = req.body;
  const teacherId = req.user._id;

  const record = await setInternalMarks(studentId, subjectId, classId, internalMarks, teacherId);

  sendResponse(res, 200, "Internal marks set", {
    studentId: record.studentId,
    subjectId: record.subjectId,
    internalMarks: record.internalMarks,
  });
});

// add bulkwrite for all students
const bulkSubmitMarksController = catchAsync(async (req, res) => {
  const { subjectId, classId, type, records } = req.body;
  const teacherId = req.user._id;

  const result = await bulkSubmitMarks(subjectId, classId, type, records, teacherId);

  sendResponse(res, 200, `Bulk ${type} marks submitted`, result);
});

//  getting all student marks that belong to same class and subject
const getClassMarksController = catchAsync(async (req, res) => {
  const { classId, subjectId } = req.params;

  const data = await getClassMarks(subjectId, classId);

  sendResponse(res, 200, "Class marks fetched successfully", data);
});

//   get student marks and avg marks per each subject 
const getStudentMarksController = catchAsync(async (req, res) => {
  const studentId = req.user._id;

  const data = await getStudentMarks(studentId);

  sendResponse(res, 200, "Student marks fetched successfully", data);
});

module.exports = {
  addQuizMarkController,
  addAssignmentMarkController,
  setInternalMarksController,
  bulkSubmitMarksController,
  getClassMarksController,
  getStudentMarksController,
};