const catchAsync = require("../../utils/catchAsync");
const sendResponse = require("../../utils/response.util");

const {
  getStudentDashboard,
  getClassDashboard,
  getStudentDetailForTeacher,
getDepartmentAnalytics
} = require("./analytics.service");

// Student Dashboard
// GET /api/analytics/student/dashboard
const getMyDashboard = catchAsync(async (req, res) => {
  const studentId = req.user._id;

  const data = await getStudentDashboard(studentId);

  sendResponse(
    res,
    200,
    "Student dashboard fetched successfully",
    data
  );
});

// Teacher Class Analytics
// GET /api/analytics/teacher/class/:classId
const getClassAnalytics = catchAsync(async (req, res) => {
  const { classId } = req.params;

  const data = await getClassDashboard(classId);

  sendResponse(
    res,
    200,
    "Class analytics fetched successfully",
    data
  );
});

// Teacher Student Detail
// GET /api/analytics/teacher/student/:studentId
const getStudentDetail = catchAsync(async (req, res) => {
  const { studentId } = req.params;

  const data = await getStudentDetailForTeacher(studentId);

  sendResponse(
    res,
    200,
    "Student detail fetched successfully",
    data
  );
});

// HOD Department Analytics
// GET /api/analytics/department/:departmentId
const getDepartmentAnalytic = catchAsync(async (req, res) => {
  const { departmentId } = req.params;

  const data = await getDepartmentAnalytics(departmentId);

  sendResponse(
    res,
    200,
    "Department analytics fetched successfully",
    data
  );
});

module.exports = {
  getMyDashboard,
  getClassAnalytics,
  getStudentDetail,
  getDepartmentAnalytic,
};