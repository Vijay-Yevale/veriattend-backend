const mongoose = require("mongoose");

const subjectStatSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },

    attendancePercentage: {
      type: Number,
      required: true,
    },

    quizAverage: {
      type: Number,
      default: null,
    },

    assignmentAverage: {
      type: Number,
      default: null,
    },

    internalMarks: {
      type: Number,
      default: null,
    },

    performanceScore: {
      type: Number,
      required: true,
    },

    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      required: true,
    },
  },
  {
    _id: false,
  }
);

const riskProfileSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    attendancePercentage: {
      type: Number,
      default: null,
    },

    quizAverage: {
      type: Number,
      default: null,
    },

    assignmentAverage: {
      type: Number,
      default: null,
    },

    internalMarks: {
      type: Number,
      default: null,
    },

    performanceScore: {
      type: Number,
      default: null,
    },

    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: null,
      index: true,
    },

    riskScore: {
      type: Number,
      default: null,
    },

    passProbability: {
      type: Number,
      default: null,
    },

    weakSubjects: {
      type: [subjectStatSchema],
      default: [],
    },

    strongSubjects: {
      type: [subjectStatSchema],
      default: [],
    },

    predictedBy: {
      type: String,
      enum: ["ML", "FALLBACK"],
      default: null,
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("RiskProfile", riskProfileSchema);