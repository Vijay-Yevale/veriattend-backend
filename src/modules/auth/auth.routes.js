const express = require("express");
const authRouter = express.Router();
const { register, login } = require("./auth.controller.js");
const validate = require("../../middleware/validate.middleware.js");
const { registerSchema, loginSchema } = require("./auth.validator.js");


authRouter.post("/register", validate(registerSchema), register);
authRouter.post("/login", validate(loginSchema), login);

module.exports = authRouter;
