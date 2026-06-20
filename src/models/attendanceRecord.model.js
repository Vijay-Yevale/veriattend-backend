const mongoose = require("mongoose");

const attendanceRecordSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: [true, "sessionId required"],
    },

    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "teacherId required"],
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "studentId required"],
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "classId required"],
    },

    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "subjectId required"],
    },

    studentLat: {
      type: Number,
      required: [
        function () {
          return this.markedBy === "SELF";
        },
        "Student latitude is required for self-attendance",
      ],
    },

    studentLng: {
      type: Number,
      required: [
        function () {
          return this.markedBy === "SELF";
        },
        "Student longitude is required for self-attendance",
      ],
    },

    markedBy: {
      type: String,
      enum: ["SELF", "TEACHER"],
      default: "SELF",
    },

    
    reason: {
      type: String,
      required: [
        function () {
          return this.markedBy === "TEACHER";
        },
        "Reason is required for manual attendance",
      ],
      trim: true,
      default: null,
    },

    markedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

attendanceRecordSchema.index(
  {
    sessionId: 1,
    studentId: 1,
  },
  {
    unique: true,
  }
);

const Record = mongoose.model("Record", attendanceRecordSchema);
module.exports = Record;