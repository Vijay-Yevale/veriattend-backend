const express = require("express");
const authRouter = express.Router();

const {
  register,
  login,
} = require("./auth.controller");

const validate = require("../../middleware/validate.middleware");

const {
  registerSchema,
  loginSchema,
} = require("./auth.validator");

authRouter.post(
  "/register",
  validate(registerSchema),
  register
);

authRouter.post(
  "/login",
  validate(loginSchema),
  login
);

module.exports = authRouter;