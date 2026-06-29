const express = require("express");
const authRouter = express.Router();

const {
  register,
  login,
  getUser
} = require("./auth.controller");

const validate = require("../../middleware/validate.middleware");

const {
  registerSchema,
  loginSchema,
 
} = require("./auth.validator");
const authMiddleware = require("../../middleware/auth.middleware");

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

authRouter.get("/me",authMiddleware,getUser);

module.exports = authRouter;