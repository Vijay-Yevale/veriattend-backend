const catchAsync  = require("../../utils/catchAsync");
const sendResponse = require("../../utils/response.util");

const {
  getStudentDashboard,
  getClassDashboard,
  getStudentDetailForTeacher,
  getDepartmentDashboard,
} = require("./analytics.service");

//api/analytics/student/me - student dashboard
const getMyDashboard = catchAsync(async (req, res) => {
  const studentId = req.user._id;

  const data = await getStudentDashboard(studentId);

  sendResponse(res, 200, "Student dashboard fetched successfully", data);
});

//  api/analytics/teacher/class/:classId  - class analytics
const getClassAnalytics = catchAsync(async (req, res) => {
  const { classId } = req.params;

  const data = await getClassDashboard(classId);

  sendResponse(res, 200, "Class analytics fetched successfully", data);
});

//   api/analytics/teacher/student/:studentId ─ teacher can see single student 
const getStudentDetail = catchAsync(async (req, res) => {
  const { studentId } = req.params;

  const data = await getStudentDetailForTeacher(studentId);

  sendResponse(res, 200, "Student detail fetched successfully", data);
});

//api/analytics/hod/department/:departmentId - department analtyics
const getDepartmentAnalytics = catchAsync(async (req, res) => {
  const { departmentId } = req.params;

  const data = await getDepartmentDashboard(departmentId);

  sendResponse(res, 200, "Department analytics fetched successfully", data);
});


module.exports = {
  getMyDashboard,
  getClassAnalytics,
  getStudentDetail,
  getDepartmentAnalytics,

};