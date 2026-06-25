const express = require("express");
const {
  addQuizMarkController,
  addAssignmentMarkController,
  setInternalMarksController,
  bulkSubmitMarksController,
  getClassMarksController,
  getStudentMarksController,} = require("./academicRecord.controller");

const {
  addQuizMarkSchema,
  addAssignmentMarkSchema,
  setInternalMarksSchema,
  bulkMarksSchema,
} = require("./academicRecord.validator");

const authMiddleware = require("../../middleware/auth.middleware");
const validate = require("../../middleware/validate.middleware");
const allowOnly = require("../../middleware/role.middleware");

const academicRouter = express.Router();

academicRouter.use(authMiddleware);

academicRouter.post("/quiz",validate(addQuizMarkSchema), allowOnly("TEACHER"), addQuizMarkController);
academicRouter.post("/assignment",validate(addAssignmentMarkSchema), allowOnly("TEACHER"), addAssignmentMarkController);
academicRouter.put("/internal",validate(setInternalMarksSchema), allowOnly("TEACHER"), setInternalMarksController);
academicRouter.post("/bulk",validate(bulkMarksSchema), allowOnly("TEACHER"), bulkSubmitMarksController);

academicRouter.get("/class/:classId/subject/:subjectId", allowOnly("TEACHER", "HOD"), getClassMarksController);
academicRouter.get("/student/me", allowOnly("STUDENT"),getStudentMarksController);

module.exports = academicRouter;