const Joi = require("joi");

const registerSchema = Joi.object({
  userName: Joi.string().trim().min(3).required().messages({
      "string.min":
        "Username must be at least 3 characters",
      "any.required":
        "Username is required",
    }),

  email: Joi.string().email().required().messages({
      "string.email":
        "Please provide a valid email",
      "any.required":
        "Email is required",
    }),

  password: Joi.string().min(6).required().messages({
      "string.min":
        "Password must be at least 6 characters",
      "any.required":
        "Password is required",
    }),

  PRN: Joi.string().trim().uppercase().pattern(/^RBT\d{2}[A-Z]+\d+$/)
    .required()
    .messages({
      "string.pattern.base":
        "PRN must be in format like RBT23CS130",
      "any.required":
        "PRN is required",
    }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
      "string.email":
        "Please provide a valid email",
      "any.required":
        "Email is required",
    }),

  password: Joi.string()
    .required()
    .messages({
      "any.required":
        "Password is required",
    }),
});

module.exports = {
  registerSchema,
  loginSchema,
};