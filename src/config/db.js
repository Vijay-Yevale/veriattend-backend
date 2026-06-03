const mongoose = require("mongoose");
const { MONGO_URI } = require("./env.js");  
                                           

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);       
                                             
    console.log("MongoDB successfully connected");
  } catch (err) {
    console.log("Database connection error", err);
    process.exit(1);
  }
};

module.exports = connectDB;