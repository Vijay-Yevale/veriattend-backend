const Joi = require("joi");


const objectId = Joi.string()
  .hex()
  .length(24)
  .required()
  .messages({
    "any.required": "{{#label}} is required.",
    "string.base": "{{#label}} must be a string.",
    "string.empty": "{{#label}} cannot be empty.",
    "string.hex": "{{#label}} must be a valid MongoDB ObjectId (24 hexadecimal characters).",
    "string.length": "{{#label}} must be exactly 24 characters long.",
  });



const classIdParamSchema = Joi.object({
  classId: objectId.label("Class ID"),
}).messages({
  "object.base": "Route parameters must be a valid object.",
});


const classSubjectParamSchema = Joi.object({
  classId: objectId.label("Class ID"),
  subjectId: objectId.label("Subject ID"),
}).messages({
  "object.base": "Route parameters must be a valid object.",
});


const departmentIdParamSchema = Joi.object({
  departmentId: objectId.label("Department ID"),
}).messages({
  "object.base": "Route parameters must be a valid object.",
});



const studentIdParamSchema = Joi.object({
  studentId: objectId.label("Student ID"),
}).messages({
  "object.base": "Route parameters must be a valid object.",
});

module.exports = {
  classIdParamSchema,
  classSubjectParamSchema,
  departmentIdParamSchema,
  studentIdParamSchema,
};