const mongoose = require("mongoose");

const teacherSubjectSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Teacher is required"],
    },

    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Subject is required"],
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Class is required"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// One teacher per subject per class.
// Prevents HOD from assigning two different teachers to the same subject+class.
teacherSubjectSchema.index(
  { subjectId: 1, classId: 1,isActive:1 },
  { unique: true }
);

module.exports =
  mongoose.models.TeacherSubject ||
  mongoose.model("TeacherSubject", teacherSubjectSchema);