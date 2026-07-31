const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema(
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

    room: {
      type: String,
      required: [true, "Room is required"],
      trim: true,
    },

    weekDay: {
      type: String,
      enum: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
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

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// weekType dropped from the compound key — a slot is now uniquely
// identified by class + day + start time, full stop.
timetableSchema.index(
  { classId: 1, weekDay: 1, startTime: 1 },
  { unique: true }
);

const Timetable = mongoose.model("Timetable", timetableSchema);
module.exports = Timetable;