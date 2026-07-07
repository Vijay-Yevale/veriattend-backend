const express = require("express");

const {
  getMyDashboard,
  getStudentDashboardById,
  getClassAnalytics,
  getStudentDetail,
  getDepartmentAnalytic,
} = require("./analytics.controller");

const {
  classIdParamSchema,
  departmentIdParamSchema,
  studentIdParamSchema,
  classDashboardQuerySchema
} = require("./analytics.validator");

const authMiddleware = require("../../middleware/auth.middleware");
const validate = require("../../middleware/validate.middleware");
const allowOnly = require("../../middleware/role.middleware");

const analyticsRouter = express.Router();

analyticsRouter.use(authMiddleware);

// Student Routes
analyticsRouter.get(
  "/student/dashboard",
  allowOnly("STUDENT"),
  getMyDashboard
);


//hod and superadmin
analyticsRouter.get("/students/:studentId/dashboard", 
  validate(studentIdParamSchema, "params"), 
  allowOnly("SUPER_ADMIN", "HOD"), getStudentDashboardById);

// Teacher Routes
analyticsRouter.get(
  "/class/:classId",
  validate(classIdParamSchema, "params"),
  validate(classDashboardQuerySchema, "query"),
  allowOnly("TEACHER", "HOD", "SUPER_ADMIN"),
  getClassAnalytics
);

analyticsRouter.get(
  "/teacher/student/:studentId",
  validate(studentIdParamSchema, "params"),
  allowOnly("TEACHER", "HOD"),
  getStudentDetail
);

// HOD Routes
analyticsRouter.get(
  "/:departmentId",
  validate(departmentIdParamSchema, "params"),
  allowOnly("HOD", "SUPER_ADMIN"),
  getDepartmentAnalytic
);

module.exports = analyticsRouter;