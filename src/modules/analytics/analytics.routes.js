const express = require("express");

const {
  getMyDashboard,
  getStudentDashboardById,
  getClassAnalytics,
  getStudentSubjectDetailController,
  getDepartmentAnalytic,
} = require("./analytics.controller");

const {
  classIdParamSchema,
  classSubjectParamSchema,
  departmentIdParamSchema,
  studentIdParamSchema,
  classDashboardQuerySchema,
  studentSubjectParamSchema
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
  allowOnly(
    "SUPER_ADMIN",
    "HOD",
    "TEACHER"
  ), getStudentDashboardById);

// Teacher Routes
analyticsRouter.get(
  "/class/:classId",
  validate(classIdParamSchema, "params"),
  validate(classDashboardQuerySchema, "query"),
  allowOnly("TEACHER", "HOD", "SUPER_ADMIN"),
  getClassAnalytics
);

analyticsRouter.get(
  "/student/:studentId/subject/:subjectId",
  validate(studentSubjectParamSchema, "params"),
  allowOnly("TEACHER", "HOD", "SUPER_ADMIN"),
  getStudentSubjectDetailController
);
// HOD Routes
analyticsRouter.get(
  "/department",
 
  allowOnly( "HOD"),
  getDepartmentAnalytic
);

analyticsRouter.get(
  "/department/:departmentId",
  validate(departmentIdParamSchema, "params"),
  allowOnly( "SUPER_ADMIN"),
  getDepartmentAnalytic
);

module.exports = analyticsRouter;