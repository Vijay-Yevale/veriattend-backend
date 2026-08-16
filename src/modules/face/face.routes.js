const {
  enroll,

  getProfile,
  checkRegistration,
} = require("./face.controller");

const validate = require("../../middleware/validate.middleware");
const {
  enrollFaceSchema,
  verifyFaceSchema,
} = require("./face.validator");

const authMiddleware = require("../../middleware/auth.middleware");
const allowOnly = require("../../middleware/role.middleware");
const express = require("express");

const faceRouter = express.Router();

faceRouter.use(authMiddleware);



// Enroll / update student's face
faceRouter.post(
  "/enroll",
  validate(enrollFaceSchema),
  allowOnly("STUDENT"),
  enroll
);




// Get student's face profile
faceRouter.get("/profile", allowOnly("STUDENT"), getProfile);

// Check whether student's face is registered
faceRouter.get("/status", allowOnly("STUDENT"), checkRegistration);

module.exports = faceRouter;