const express = require("express");
const authRouter = express.Router();
const { register, login } = require("./auth.controller.js");
const validate = require("../../middleware/validate.middleware.js");
const authMiddleware = require("../../middleware/auth.middleware.js"); 
const { registerSchema, loginSchema } = require("./auth.validator.js");
const allowOnly = require("../../middleware/role.middleware.js");

authRouter.post("/register", validate(registerSchema), register);
authRouter.post("/login", validate(loginSchema), login);



module.exports = authRouter;