const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const allowOnly = require("../../middleware/role.middleware");
const validate = require("../../middleware/validate.middleware");

const {
  createDepartmentSchema,
  createHodSchema,
  createTeacherSchema,
  createClassSchema,
  createSubjectSchema,
  createTeacherSubjectSchema,
  bulkAssignClassSchema,

  departmentIdParamSchema,
  classIdParamSchema,
} = require("./admin.validator");

const {
  // CREATE
  department,
  hod,
  teacher,
  classes,
  subject,

  // ASSIGN
  bulkAssignStudents,
  assignTeacher,

  // GET
  getDepartments,
  departmentDetails,
  getTeacher,
  getClass,
  getSubject,
  pendingStudents,
  studentsByClass,
} = require("./admin.controller");

const adminRouter = express.Router();

adminRouter.use(authMiddleware);


// SUPER ADMIN


adminRouter.post(
  "/departments",
  validate(createDepartmentSchema),
  allowOnly("SUPER_ADMIN"),
  department
);

adminRouter.post(
  "/hod",
  validate(createHodSchema),
  allowOnly("SUPER_ADMIN"),
  hod
);

adminRouter.get(
  "/departments",
  allowOnly("SUPER_ADMIN", "HOD"),
  getDepartments
);

adminRouter.get(
  "/departments/:departmentId",
  validate(departmentIdParamSchema, "params"),
  allowOnly("SUPER_ADMIN"),
  departmentDetails
);


// HOD


adminRouter.post(
  "/teacher",
  validate(createTeacherSchema),
  allowOnly("HOD"),
  teacher
);

adminRouter.post(
  "/classes",
  validate(createClassSchema),
  allowOnly("HOD"),
  classes
);

adminRouter.post(
  "/subject",
  validate(createSubjectSchema),
  allowOnly("HOD"),
  subject
);

adminRouter.patch(
  "/bulk-assign-students",
  validate(bulkAssignClassSchema),
  allowOnly("HOD"),
  bulkAssignStudents
);

adminRouter.patch(
  "/assign-teacher",
  validate(createTeacherSubjectSchema),
  allowOnly("HOD"),
  assignTeacher
);

adminRouter.get(
  "/teachers",
  allowOnly("HOD"),
  getTeacher
);

adminRouter.get(
  "/classes",
  allowOnly("HOD"),
  getClass
);

adminRouter.get(
  "/subjects",
  allowOnly("HOD"),
  getSubject
);

adminRouter.get(
  "/pending-students",
  allowOnly("HOD"),
  pendingStudents
);

adminRouter.get(
  "/students/:classId",
  validate(classIdParamSchema, "params"),
  allowOnly("HOD"),
  studentsByClass
);

module.exports = adminRouter;