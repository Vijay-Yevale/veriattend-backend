const Joi = require("joi");
const { faceEmbeddingSchema } = require("../face/face.validator");

const objectId = Joi.string().hex().length(24);

const startAttendanceSchema = Joi.object({
  anchorLat: Joi.number()
    .min(-90)
    .max(90)
    .required()
    .messages({
      "any.required": "anchor Latitude Required",
      "number.min": "Latitude must be greater than or equal to -90",
      "number.max": "Latitude must be less than or equal to 90",
    }),

  anchorLng: Joi.number()
    .min(-180)
    .max(180)
    .required()
    .messages({
      "any.required": "anchor Longitude Required",
      "number.min": "Longitude must be greater than or equal to -180",
      "number.max": "Longitude must be less than or equal to 180",
    }),
});

// STAGE 1 — QR + GPS only. No embedding here: submitAttendance() doesn't
// accept one, and forcing a face capture before the token even exists
// just adds a wasted round trip on the client.
const submitAttendanceSchema = Joi.object({
  qrToken: Joi.string().required().messages({
    "any.required": "QR token required",
  }),
  deviceId: Joi.string()
    .trim()
    .min(5)
    .max(200)
    .required()
    .messages({
      "any.required": "deviceId required",
      "string.min": "Invalid deviceId",
    }),
  studentLat: Joi.number()
    .min(-90)
    .max(90)
    .required()
    .messages({
      "any.required": "Latitude required",
      "number.min": "Latitude must be >= -90",
      "number.max": "Latitude must be <= 90",
    }),
  studentLng: Joi.number()
    .min(-180)
    .max(180)
    .required()
    .messages({
      "any.required": "Longitude required",
      "number.min": "Longitude must be >= -180",
      "number.max": "Longitude must be <= 180",
    }),
});

// STAGE 2 — face verification + attendance creation. Takes the token
// issued by stage 1 plus the live embedding; this is what actually
// reaches verifyFaceAndMarkAttendance() in the service.
const verifyFaceAttendanceSchema = Joi.object({
  verificationToken: Joi.string().required().messages({
    "any.required": "verificationToken required",
    "string.empty": "verificationToken cannot be empty",
  }),
  embedding: faceEmbeddingSchema,
});

const manualAttendanceSchema = Joi.object({
  studentIds: Joi.array()
    .items(
      objectId.required().messages({
        "any.required": "studentId required",
        "string.hex": "Invalid studentId",
        "string.length": "Invalid studentId",
      })
    )
    .min(1)
    .required()
    .messages({
      "any.required": "studentIds required",
      "array.min": "At least 1 student required",
      "array.base": "studentIds must be an array",
    }),

  reason: Joi.string()
    .required()
    .messages({
      "any.required": "reason required",
      "string.empty": "reason cannot be empty",
    }),
});

const SessionSchema = Joi.object({
  sessionId: objectId.required().messages({
    "any.required": "sessionId required",
    "string.hex": "Invalid sessionId",
    "string.length": "Invalid sessionId",
  }),
});

const classIdParamSchema = Joi.object({
  classId: objectId.required().messages({
    "any.required": "classId required",
    "string.hex": "Invalid classId",
    "string.length": "Invalid classId",
  }),
});

const todayOnlyQuerySchema = Joi.object({
  todayOnly: Joi.boolean().optional(),
});

const teacherIdSchema = Joi.object({
  teacherId: objectId.required().messages({
    "any.required": "teacherId required",
    "string.hex": "Invalid teacherId",
    "string.length": "Invalid teacherId",
  }),
});

const recordIdSchema = Joi.object({
  recordId: objectId.required().messages({
    "any.required": "recordId required",
    "string.hex": "Invalid recordId",
    "string.length": "Invalid recordId",
  }),
});

const reviewQuerySchema = Joi.object({
  search: Joi.string().trim().max(100).allow("").optional(),
});

module.exports = {
  startAttendanceSchema,
  submitAttendanceSchema,
  verifyFaceAttendanceSchema,
  manualAttendanceSchema,
  SessionSchema,
  classIdParamSchema,
  todayOnlyQuerySchema,
  teacherIdSchema,
  recordIdSchema,
  reviewQuerySchema,
};