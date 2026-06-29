const express = require("express");

const validate = require("../../middleware/validate.middleware");
const allowOnly = require("../../middleware/role.middleware");
const authMiddleware = require("../../middleware/auth.middleware");

const {
  createHodSchema,
  createTeacherSchema,
  createDepartmentSchema,
  createClassSchema,
  createSubjectSchema,
  createTeacherSubjectSchema,
  bulkAssignClassSchema,
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
  getTeacher,
  getClass,
  getSubject,
  pendingStudents,
  studentsByClass,
} = require("./admin.controller");

const adminRouter = express.Router();

// AUTH

adminRouter.use(authMiddleware);

// SUPER ADMIN ROUTES

adminRouter.post(
  "/department",
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

// HOD ROUTES


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


// GET ROUTES

// departments (super admin / hod)

adminRouter.get(
  "/departments",
  allowOnly("SUPER_ADMIN", "HOD"),
  getDepartments
);

// HOD's department teachers

adminRouter.get(
  "/teachers",
  allowOnly("HOD"),
  getTeacher
);

// HOD's department classes

adminRouter.get(
  "/classes",
  allowOnly("HOD"),
  getClass
);

// HOD's department subjects

adminRouter.get(
  "/subjects",
  allowOnly("HOD"),
  getSubject
 );

// students waiting for class assignment

adminRouter.get(
  "/pending-students",
  allowOnly("HOD"),
  pendingStudents
);

// students of a class

adminRouter.get(
  "/students/:classId",
  allowOnly("HOD"),
  studentsByClass
);

module.exports = adminRouter;