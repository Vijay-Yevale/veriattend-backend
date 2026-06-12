const Joi = require("joi");

const objectId = Joi.string().hex().length(24).required();

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const toMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const createTimetableSchema = Joi.object({
  teacherId: objectId.messages({
    "any.required": "teacherId is required",
    "string.length": "teacherId must be a valid MongoDB ObjectId",
  }),
  subjectId: objectId.messages({
    "any.required": "subjectId is required",
    "string.length": "subjectId must be a valid MongoDB ObjectId",
  }),
  classId: objectId.messages({
    "any.required": "classId is required",
    "string.length": "classId must be a valid MongoDB ObjectId",
  }),
  room: Joi.string().trim().required().messages({
    "any.required": "room is required",
    "string.empty": "room cannot be empty",
  }),
  weekDay: Joi.string()
    .valid(...weekDays)
    .required()
    .messages({
      "any.required": "weekDay is required",
      "any.only": "weekDay must be Monday-Saturday",
    }),
  weekType: Joi.string()
    .valid("all", "odd", "even")
    .default("all")
    .messages({
      "any.only": "weekType must be all, odd, or even",
    }),
  startTime: Joi.string()
    .pattern(timeRegex)
    .required()
    .messages({
      "any.required": "startTime is required",
      "string.pattern.base": "startTime must be HH:MM 24-hour format",
    }),
  endTime: Joi.string()
    .pattern(timeRegex)
    .required()
    .messages({
      "any.required": "endTime is required",
      "string.pattern.base": "endTime must be HH:MM 24-hour format",
    }),
}).custom((value, helpers) => {
  if (toMinutes(value.endTime) <= toMinutes(value.startTime)) {
    return helpers.message("endTime must be after startTime");
  }
  return value;
});

const getTimetableByClassSchema = Joi.object({
  classId: objectId.messages({
    "any.required": "classId is required",
    "string.length": "classId must be a valid MongoDB ObjectId",
  }),
});

const getTimetableByTeacherSchema = Joi.object({
  teacherId: objectId.messages({
    "any.required": "teacherId is required",
    "string.length": "teacherId must be a valid MongoDB ObjectId",
  }),
});

const slotIdSchema = Joi.object({
  slotId: objectId.messages({
    "any.required": "slotId is required",
    "string.length": "slotId must be a valid MongoDB ObjectId",
  }),
});

const updateTimetableSlotSchema = Joi.object({
  room: Joi.string().trim(),
  weekDay: Joi.string().valid(...weekDays).messages({
    "any.only": "weekDay must be Monday-Saturday",
  }),
  weekType: Joi.string()
    .valid("all", "odd", "even")
    .messages({
      "any.only": "weekType must be all, odd, or even",
    }),
  startTime: Joi.string().pattern(timeRegex).messages({
    "string.pattern.base": "startTime must be HH:MM 24-hour format",
  }),
  endTime: Joi.string().pattern(timeRegex).messages({
    "string.pattern.base": "endTime must be HH:MM 24-hour format",
  }),
  teacherId: Joi.string().hex().length(24).messages({
    "string.length": "teacherId must be a valid MongoDB ObjectId",
  }),
  subjectId: Joi.string().hex().length(24).messages({
    "string.length": "subjectId must be a valid MongoDB ObjectId",
  }),
  classId: Joi.string().hex().length(24).messages({
    "string.length": "classId must be a valid MongoDB ObjectId",
  }),
})
.min(1)
.custom((value, helpers) => {
  if (value.startTime && value.endTime) {
    if (toMinutes(value.endTime) <= toMinutes(value.startTime)) {
      return helpers.message("endTime must be after startTime");
    }
  }
  return value;
})
.messages({
  "object.min": "Provide at least one field to update",
});

module.exports = {
  createTimetableSchema,
  getTimetableByClassSchema,
  getTimetableByTeacherSchema,
  slotIdSchema,
  updateTimetableSlotSchema,
};