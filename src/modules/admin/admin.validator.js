const Joi = require("joi");

const objectId = Joi.string()
  .hex()
  .length(24)
  .required();


// CREATE HOD


const createHodSchema = Joi.object({
  userName: Joi.string().trim().min(3).required().messages({
      "string.min":
        "Username must be at least 3 characters",
      "any.required":
        "Username is required",
    }),

  email: Joi.string()
    .email()
    .required()
    .messages({
      "string.email":
        "Please provide a valid email",
      "any.required":
        "Email is required",
    }),

  password: Joi.string()
    .min(6)
    .required()
    .messages({
      "string.min":
        "Password must be at least 6 characters",
      "any.required":
        "Password is required",
    }),

  departmentId: objectId.messages({
    "any.required":
      "Department ID is required",
    "string.length":
      "Department ID must be a valid MongoDB ObjectId",
  }),
});


// CREATE TEACHER


const createTeacherSchema = Joi.object({
  userName: Joi.string()
    .trim()
    .min(3)
    .required()
    .messages({
      "string.min":
        "Username must be at least 3 characters",
      "any.required":
        "Username is required",
    }),

  email: Joi.string()
    .email()
    .required()
    .messages({
      "string.email":
        "Please provide a valid email",
      "any.required":
        "Email is required",
    }),

  password: Joi.string()
    .min(6)
    .required()
    .messages({
      "string.min":
        "Password must be at least 6 characters",
      "any.required":
        "Password is required",
    }),
});


// CREATE DEPARTMENT


const createDepartmentSchema =
  Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .required()
      .messages({
        "string.min":
          "Department name must be at least 2 characters",
        "any.required":
          "Department name is required",
      }),

    code: Joi.string()
      .trim()
      .uppercase()
      .min(2)
      .required()
      .messages({
        "string.min":
          "Department code must be at least 2 characters",
        "any.required":
          "Department code is required",
      }),
  });


// CREATE CLASS


const createClassSchema = Joi.object({
  className: Joi.string()
    .trim()
    .min(2)
    .required()
    .messages({
      "string.min":
        "Class name must be at least 2 characters",
      "any.required":
        "Class name is required",
    }),

  academicYear: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Academic year must be in format YYYY-YY (e.g. 2025-26)",
      "any.required":
        "Academic year is required",
    }),

  semester: Joi.number()
    .min(1)
    .max(8)
    .required()
    .messages({
      "number.min":
        "Semester must be between 1 and 8",
      "number.max":
        "Semester must be between 1 and 8",
      "any.required":
        "Semester is required",
    }),
});


// CREATE SUBJECT


const createSubjectSchema =
  Joi.object({
    subjectName: Joi.string()
      .trim()
      .min(2)
      .required()
      .messages({
        "string.min":
          "Subject name must be at least 2 characters",
        "any.required":
          "Subject name is required",
      }),

    subjectCode: Joi.string()
      .trim()
      .uppercase()
      .min(2)
      .required()
      .messages({
        "string.min":
          "Subject code must be at least 2 characters",
        "any.required":
          "Subject code is required",
      }),

    semester: Joi.number()
      .min(1)
      .max(8)
      .required()
      .messages({
        "number.min":
          "Semester must be between 1 and 8",
        "number.max":
          "Semester must be between 1 and 8",
        "any.required":
          "Semester is required",
      }),
  });


// ASSIGN TEACHER TO SUBJECT


const createTeacherSubjectSchema =
  Joi.object({
    teacherId: objectId.messages({
      "any.required":
        "Teacher ID is required",
    }),

    subjectId: objectId.messages({
      "any.required":
        "Subject ID is required",
    }),

    classId: objectId.messages({
      "any.required":
        "Class ID is required",
    }),
  });

// ASSIGN STUDENT TO CLASS



const bulkAssignClassSchema = Joi.object({
  classId: objectId.required().messages({
    "any.required": "Class ID is required",
  }),
  studentIds: Joi.array()
    .items(objectId)
    .min(1)
    .required()
    .messages({
      "any.required": "Student IDs are required",
      "array.min": "At least one student ID required",
    }),
});

module.exports = {
  createHodSchema,
  createTeacherSchema,
  createDepartmentSchema,
  createClassSchema,
  createSubjectSchema,
  createTeacherSubjectSchema,
 bulkAssignClassSchema
};