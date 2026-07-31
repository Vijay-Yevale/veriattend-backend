const Joi = require("joi");

const objectId = Joi.string().hex().length(24).required();

const classSchema = Joi.object({
  classId: objectId.messages({
    "any.required": "classId is required",
    "string.length": "classId must be a valid MongoDB ObjectId",
  }),
});

module.exports = {
  classSchema,
};