const express = require("express");
const { classDetail, myClasses } = require("./data.controller");
const { classSchema } = require("./data.validator");
const authMiddleware = require("../../middleware/auth.middleware");
const validate = require("../../middleware/validate.middleware");
const allowOnly = require("../../middleware/role.middleware");

const dataRouter = express.Router();
dataRouter.use(authMiddleware);

dataRouter.get(
  "/class/:classId",
  validate(classSchema, "params"),
  allowOnly("HOD", "TEACHER", "STUDENT"),
  classDetail
);

dataRouter.get(
  "/teacher/my-classes",
  allowOnly("TEACHER"),
  myClasses
);

module.exports = dataRouter;