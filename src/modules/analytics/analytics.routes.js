const express = require("express");

const {
  getMyDashboard,
  getClassAnalytics,
  getStudentDetail,
  getDepartmentAnalytics,
} = require("./analytics.controller");

const {
  classIdParamSchema,
  departmentIdParamSchema,
  studentIdParamSchema,
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

// Teacher Routes
analyticsRouter.get(
  "/teacher/class/:classId",
  validate(classIdParamSchema, "params"),
  allowOnly("TEACHER", "HOD"),
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
  "/department/:departmentId",
  validate(departmentIdParamSchema, "params"),
  allowOnly("HOD", "SUPER_ADMIN"),
  getDepartmentAnalytics
);

module.exports = analyticsRouter;