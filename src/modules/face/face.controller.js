const catchAsync = require("../../utils/catchAsync");
const sendResponse = require("../../utils/response.util");

const {
  enrollFace,
  verifyFace,
  getFaceProfile,
  isFaceRegistered,
} = require("./face.service");

// ─────────────────────────────────────────────────────────────
// ENROLL / UPDATE FACE
// ─────────────────────────────────────────────────────────────

const enroll = catchAsync(async (req, res) => {
  const { embedding } = req.body;

  const faceProfile = await enrollFace({
    userId: req.user._id,
    embedding,
  });

  sendResponse(res, 201, "Face enrolled successfully", faceProfile);
});

// ─────────────────────────────────────────────────────────────
// VERIFY FACE
// ─────────────────────────────────────────────────────────────

const verify = catchAsync(async (req, res) => {
  const { embedding } = req.body;

  const result = await verifyFace({
    userId: req.user._id,
    liveEmbedding: embedding,
  });

  sendResponse(
    res,
    200,
    result.matched ? "Face verified successfully" : "Face did not match",
    result
  );
});

// ─────────────────────────────────────────────────────────────
// GET FACE PROFILE
// ─────────────────────────────────────────────────────────────

const getProfile = catchAsync(async (req, res) => {
  const faceProfile = await getFaceProfile({ userId: req.user._id });

  sendResponse(res, 200, "Face profile fetched successfully", faceProfile);
});

// ─────────────────────────────────────────────────────────────
// CHECK FACE REGISTRATION
// ─────────────────────────────────────────────────────────────

const checkRegistration = catchAsync(async (req, res) => {
  const result = await isFaceRegistered({ userId: req.user._id });

  sendResponse(
    res,
    200,
    "Face registration status fetched successfully",
    result
  );
});

module.exports = {
  enroll,
  verify,
  getProfile,
  checkRegistration,
};