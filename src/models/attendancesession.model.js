const mongoose = require("mongoose");

const attendanceSessionSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "teacherId required"],
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
    timetableSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Timetable",
      required: [true, "session slot required"],
    },
    qrToken: {
      type: String,
      required: [true, "token required"],
      unique: true,
    },
    qrExpiry: {
      type: Date,
    },
    anchorLat: {
      type: Number,
      required: [true, "latitude required"],
    },
    anchorLng: {
      type: Number,
      required: [true, "longitude required"],
    },
    anchorRadius: {
      type: Number,
      default: 100,
      min: [1, "Radius must be at least 1 meter"],
      max: [100, "Radius cannot exceed 100 meters"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      required: [true, "Session expiry required"],
    },
  },
  { timestamps: true }
);

// for that timeslot
attendanceSessionSchema.index(
  { classId: 1, subjectId: 1, timetableSlotId: 1, createdAt: -1 }
);

// qr lookup fast
attendanceSessionSchema.index(
  { qrToken: 1, isActive: 1 }
);

const Session = mongoose.model("Session", attendanceSessionSchema);
module.exports = Session;