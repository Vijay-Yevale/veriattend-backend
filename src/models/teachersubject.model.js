

const mongoose = require("mongoose");

const teacherSubjectSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // role: TEACHER
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

    // isActive lets HOD deactivate an assignment without deleting it.
    // Useful for mid-semester teacher changes — history is preserved.
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: one teacher can only be assigned to
// the same subject+class combination once.
// Without this, HOD could accidentally create duplicate assignments.
teacherSubjectSchema.index(
  { teacherId: 1, subjectId: 1, classId: 1 },
  { unique: true }
);

const TeacherSubject = mongoose.model("TeacherSubject", teacherSubjectSchema);
module.exports = TeacherSubject;