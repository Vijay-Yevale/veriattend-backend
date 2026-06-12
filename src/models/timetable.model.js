

const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema(
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

    room: {
      type: String,
      required: [true, "Room is required"],
      trim: true,
    },

    weekDay: {
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      required: [true, "Week day is required"],
    },

    startTime: {

      type: String,
      required: [true, "Start time is required"],
    },

    endTime: {
      type: String,
      required: [true, "End time is required"],
    },
    weekType: { type: String, 
      enum: ["all", "odd", "even"],
       default: "all"
       },

    isActive: {
      // HOD can deactivate a timetable slot without deleting it.
      // Useful for cancelled classes or teacher changes mid-semester.
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ ADDED: Compound index to prevent duplicate timetable entries.
// A class cannot have two subjects in the same room on the same day at the same time.
// Without this index, HOD could accidentally double-book a slot.
timetableSchema.index(
  { classId: 1, weekDay: 1, startTime: 1 },
  { unique: true }
);

const Timetable = mongoose.model("Timetable", timetableSchema);
module.exports = Timetable;