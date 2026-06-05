const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    subjectName: {
      type: String,
      required: [true, "Subject required"],
      trim: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,  
      ref: "User",                          
      required: [true, "Teacher required"],  
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Class required"],    
    },
  },
  {
    timestamps: true,
  }
);

const Subject = mongoose.model("Subject", subjectSchema);
module.exports = Subject;