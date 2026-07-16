const catchAsync = require("../../utils/catchAsync");
const sendResponse = require("../../utils/response.util");

const {
  getStudentDashboard,
  getClassDashboard,
  getStudentSubjectDetail,
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

//hod,super_admin can access

const getStudentDashboardById = catchAsync(async (req, res) => {
  const { studentId } = req.params;

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
  const { subjectId } = req.query;

  const data = await getClassDashboard(
    classId,
    req.user,
    subjectId
  );

  sendResponse(
    res,
    200,
    "Class analytics fetched successfully",
    data
  );
});

// student detail per subject 
const getStudentSubjectDetailController = catchAsync(async (req, res) => {
  const { studentId, subjectId } = req.params;

  const data = await getStudentSubjectDetail(
    studentId,
    subjectId,
    req.user
  );

  sendResponse(
    res,
    200,
    "Student subject detail fetched successfully",
    data
  );
});

// HOD Department Analytics
// GET /api/analytics/department/:departmentId
const getDepartmentAnalytic = catchAsync(async (req, res) => {
  const { departmentId } = req.params;

  const data = await getDepartmentAnalytics(
    departmentId,
    req.user
  );

  sendResponse(
    res,
    200,
    "Department analytics fetched successfully",
    data
  );
});

module.exports = {
  getMyDashboard,
  getStudentDashboardById,
  getClassAnalytics,
  getStudentSubjectDetailController,
  getDepartmentAnalytic,
};