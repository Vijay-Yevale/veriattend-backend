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
      enum: ["teacher", "student"],
      default: "student",
    },
    PRN: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    refreshToken: {
      type: String,
      default: null,
    },
    deviceId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);
module.exports = User;