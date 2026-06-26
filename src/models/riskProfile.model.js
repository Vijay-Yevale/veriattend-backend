const mongoose = require("mongoose");

const subjectStatSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    subjectName: {
      type: String,
      required: true,
    },
    attendancePercentage: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const riskProfileSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, 
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
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
      type: Number, // stored as-is (out of 30)
      default: null,
    },

    //  computed by Node 
    performanceScore: {
      type: Number, // 0 - 100
      default: null,
    },

    //  from Flask ML service
    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: null,
    },

    riskScore: {
      type: Number, // raw probability of HIGH risk (0.0 - 1.0)
      default: null,
    },

    passProbability: {
      type: Number, // P(LOW) + P(MEDIUM) → 0.0 to 1.0
      default: null,
    },

    //  subject breakdown
    weakSubjects: {
      type: [subjectStatSchema],
      default: [], // attendance < 75%
    },

    strongSubjects: {
      type: [subjectStatSchema],
      default: [], // attendance >= 85%
    },


    predictedBy: {
      type: String,
      enum: ["ML", "FALLBACK"],
      default: null, // ML = Flask responded, FALLBACK = Flask was down
    },

    lastUpdated: {
      type: Date,
      default: null, // timestamp of last cron run
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RiskProfile", riskProfileSchema);