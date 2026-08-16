const AppError = require("../../utils/AppError");

const EMBEDDING_DIMENSION = 192;

// Shared by enrollFace and verifyFace so both reject malformed

const assertValidEmbedding = (embedding) => {
  if (!Array.isArray(embedding)) {
    throw new AppError("Face embedding must be an array", 400);
  }

  if (embedding.length !== EMBEDDING_DIMENSION) {
    throw new AppError(
      `Face embedding must contain exactly ${EMBEDDING_DIMENSION} values`,
      400
    );
  }

  const hasInvalidValue = embedding.some(
    (value) => typeof value !== "number" || !Number.isFinite(value)
  );

  if (hasInvalidValue) {
    throw new AppError("Face embedding contains invalid values", 400);
  }
};

// Cosine similarity of two equal-length vectors, range -1..1.
// 1 = identical direction, 0 = unrelated, -1 = opposite.
const cosineSimilarity = (vecA, vecB) => {
  if (vecA.length !== vecB.length) {
    throw new AppError("Embeddings must be the same length to compare", 500);
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

module.exports = {
  EMBEDDING_DIMENSION,
  assertValidEmbedding,
  cosineSimilarity,
};