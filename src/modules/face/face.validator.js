const Joi = require("joi");


// Face Embedding


const faceEmbeddingSchema = Joi.array()
  .items(
    Joi.number()
      .required()
      .messages({
        "number.base": "Each face embedding value must be a number",
        "any.required": "Face embedding value is required",
      })
  )
  .length(192)
  .required()
  .messages({
    "array.base": "Face embedding must be an array",
    "array.length": "Face embedding must contain exactly 192 values",
    "any.required": "Face embedding is required",
  });


// Enroll Face


const enrollFaceSchema = Joi.object({
  embedding: faceEmbeddingSchema,
});


// Verify Face


const verifyFaceSchema = Joi.object({
  embedding: faceEmbeddingSchema,
});

module.exports = {
  enrollFaceSchema,
  verifyFaceSchema,
  faceEmbeddingSchema
};