
const mongoose = require("mongoose");

const academicRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    quizMarks: {
      type: [Number],
      default: [],        // e.g. [8, 7, 9] → average computed at query time
    },
    assignmentMarks: {
      type: [Number],
      default: [],        // e.g. [18, 20, 17]
    },
    internalMarks: {
      type: Number,
      default: null,      // out of 30, entered once after internal exam
    },
  },
  { timestamps: true }
);

// One record per student per subject per class
academicRecordSchema.index(
  { studentId: 1, subjectId: 1, classId: 1 },
  { unique: true }
);

module.exports = mongoose.model("AcademicRecord", academicRecordSchema);