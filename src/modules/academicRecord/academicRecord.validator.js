const Joi = require("joi");

const objectId = Joi.string()
  .hex()
  .length(24)
  .required()
  .messages({
    "string.base": "Must be a string",
    "string.hex": "Invalid ObjectId",
    "string.length": "Invalid ObjectId",
    "any.required": "Field is required",
  });

// Add a single quiz mark --- 10 marks at most
const addQuizMarkSchema = Joi.object({
  studentId: objectId.label("Student ID"),
  subjectId: objectId.label("Subject ID"),
  classId: objectId.label("Class ID"),
  mark: Joi.number()
    .min(0)
    .max(10)
    .required()
    .messages({
      "number.base": "Quiz mark must be a number",
      "number.min": "Quiz mark cannot be less than 0",
      "number.max": "Quiz mark cannot be greater than 10",
      "any.required": "Quiz mark is required",
    }),
});
        
//  Add a single assignment mark --- atmost 25 marks
const addAssignmentMarkSchema = Joi.object({
  studentId: objectId.label("Student ID"),
  subjectId: objectId.label("Subject ID"),
  classId: objectId.label("Class ID"),
  mark: Joi.number()
    .min(0)
    .max(25)
    .required()
    .messages({
      "number.base": "Assignment mark must be a number",
      "number.min": "Assignment mark cannot be less than 0",
      "number.max": "Assignment mark cannot be greater than 25",
      "any.required": "Assignment mark is required",
    }),
});

//  Set internal marks -- atmost 30 marks
const setInternalMarksSchema = Joi.object({
  studentId: objectId.label("Student ID"),
  subjectId: objectId.label("Subject ID"),
  classId: objectId.label("Class ID"),
  internalMarks: Joi.number()
    .min(0)
    .max(30)
    .required()
    .messages({
      "number.base": "Internal marks must be a number",
      "number.min": "Internal marks cannot be less than 0",
      "number.max": "Internal marks cannot be greater than 30",
      "any.required": "Internal marks are required",
    }),
});

//  Bulk marks submission 
const bulkMarksSchema = Joi.object({
  subjectId: objectId.label("Subject ID"),
  classId: objectId.label("Class ID"),

  type: Joi.string()
    .valid("quiz", "assignment", "internal")
    .required()
    .messages({
      "string.base": "Type must be a string",
      "any.only": "Type must be quiz, assignment or internal",
      "any.required": "Type is required",
    }),

  records: Joi.array()
    .items(
      Joi.object({
        studentId: objectId.label("Student ID"),

        mark: Joi.number()
          .min(0)
          .required()
          .messages({
            "number.base": "Mark must be a number",
            "number.min": "Mark cannot be less than 0",
            "any.required": "Mark is required",
          }),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.base": "Records must be an array",
      "array.min": "At least one student record is required",
      "any.required": "Records are required",
    }),
});

module.exports = {
  addQuizMarkSchema,
  addAssignmentMarkSchema,
  setInternalMarksSchema,
  bulkMarksSchema,
};