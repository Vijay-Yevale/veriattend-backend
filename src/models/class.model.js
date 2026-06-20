const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    className: {
      type: String,
      required: [true, "Class name required"],
      trim: true,
     
    },

    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required"],
    },

    academicYear: {
      type: String,
      required: [true, "Academic year is required"],
      trim: true,
    },

    semester: {
      type: Number,
      required: [true, "Semester is required"],
      min: 1,
      max: 8,
    },
  },
  {
    timestamps: true,
  }
);

classSchema.index(
  { className: 1, departmentId: 1, semester: 1, academicYear: 1 },
  { unique: true }
);

const Class = mongoose.model("Class", classSchema);
module.exports = Class;