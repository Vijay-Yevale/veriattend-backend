const mongoose = require("mongoose");

const faceProfileSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student is required"],
      unique: true,
    },

    embedding: {
      type: [Number],
      required: [true, "Face embedding is required"],
      validate: {
        validator: function (value) {
          return value.length === 192;
        },
        message: "Face embedding must contain exactly 192 values",
      },
    },

    modelName: {
      type: String,
      required: [true, "Face model name is required"],
      default: "MobileFaceNet",
      trim: true,
    },

    modelVersion: {
      type: String,
      required: [true, "Face model version is required"],
      default: "1.0",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const FaceProfile = mongoose.model("FaceProfile", faceProfileSchema);

module.exports = FaceProfile;