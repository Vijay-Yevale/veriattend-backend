const mongoose = require("mongoose");
const {MONGO_URI}= require("./src/config/env.js");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB successfully connected");
  } catch (err) {
    console.log("Database connection error", err);
    process.exit(1);
  }
};

module.exports = connectDB;