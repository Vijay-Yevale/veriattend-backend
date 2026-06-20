const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: [true, "Username is required"],
      minlength: [3, "Minimum 3 characters required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Minimum 6 characters required"],
      select: false,
    },

    role: {
      type: String,
      enum: ["SUPER_ADMIN", "HOD", "TEACHER", "STUDENT"],
      default: "STUDENT",
    },

    // Department ownership
    // STUDENT -> derived from PRN
    // TEACHER -> assigned by HOD
    // HOD -> assigned by SUPER_ADMIN
    // SUPER_ADMIN -> null
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },

    // Student only
    PRN: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },

    // Student only
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      default: null,
    },
   
    // Future attendance security
    deviceId: {
      type: String,
      default: null,
    },

    refreshToken: {
      type: String,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,

    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.deviceId;
        delete ret.__v;

        return ret;
      },
    },
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;