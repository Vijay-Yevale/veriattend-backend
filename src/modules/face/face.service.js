const User = require("../../models/user.model");
const FaceProfile = require("../../models/faceProfile.model");
const AppError = require("../../utils/AppError");
const { assertValidEmbedding, cosineSimilarity } = require("./face.utils");

const FACE_MODEL_NAME = "MobileFaceNet";
const FACE_MODEL_VERSION = "1.0";
const FACE_MATCH_THRESHOLD = 0.8; 

const enrollFace = async ({ userId, embedding }) => {
  if (!userId) {
    throw new AppError("Authenticated user is required", 401);
  }

  assertValidEmbedding(embedding);

  const user = await User.findById(userId).select("_id role");

  if (!user) {
    throw new AppError("User doesn't exist", 404);
  }

  if (user.role !== "STUDENT") {
    throw new AppError("Face recognition is available only for students", 403);
  }

  const faceProfile = await FaceProfile.findOneAndUpdate(
    { studentId: user._id },
    {
      $set: {
        embedding,
        modelName: FACE_MODEL_NAME,
        modelVersion: FACE_MODEL_VERSION,
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).select("studentId modelName modelVersion createdAt updatedAt");

  return faceProfile;
};


// Verify a live embedding against the student's stored one

// Used two ways:
//   - directly behind POST /api/face/verify, for manual testing/tuning
//   - internally from attendance.service.js, as the final gate before
//     an AttendanceRecord is created


const verifyFace = async ({ userId, liveEmbedding }) => {
  if (!userId) {
    throw new AppError("Authenticated user is required", 401);
  }

  assertValidEmbedding(liveEmbedding);

  const user = await User.findById(userId).select("_id role");

  if (!user) {
    throw new AppError("User doesn't exist", 404);
  }

  if (user.role !== "STUDENT") {
    throw new AppError("Face recognition is available only for students", 403);
  }

  const faceProfile = await FaceProfile.findOne({
    studentId: user._id,
  }).select("embedding");

  if (!faceProfile) {
    throw new AppError(
      "No face registered for this account. Please enroll your face first.",
      404
    );
  }

  const similarity = cosineSimilarity(faceProfile.embedding, liveEmbedding);
  const matched = similarity >= FACE_MATCH_THRESHOLD;

  return { matched, similarity };
};


// Get Face Profile


const getFaceProfile = async ({ userId }) => {
  if (!userId) {
    throw new AppError("Authenticated user is required", 401);
  }

  const user = await User.findById(userId).select("_id role");

  if (!user) {
    throw new AppError("User doesn't exist", 404);
  }

  if (user.role !== "STUDENT") {
    throw new AppError("Face recognition is available only for students", 403);
  }

  const faceProfile = await FaceProfile.findOne({
    studentId: user._id,
  }).select("studentId modelName modelVersion createdAt updatedAt");

  return faceProfile;
};


// Check Face Registration


const isFaceRegistered = async ({ userId }) => {
  if (!userId) {
    throw new AppError("Authenticated user is required", 401);
  }

  const user = await User.findById(userId).select("_id role");

  if (!user) {
    throw new AppError("User doesn't exist", 404);
  }

  if (user.role !== "STUDENT") {
    throw new AppError("Face recognition is available only for students", 403);
  }

  const faceProfile = await FaceProfile.exists({ studentId: user._id });

  return { registered: Boolean(faceProfile) };
};

module.exports = {
  enrollFace,
  verifyFace,
  getFaceProfile,
  isFaceRegistered,
  FACE_MATCH_THRESHOLD,
};