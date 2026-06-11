

const connectDB = require("../config/db");
const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");


dotenv.config();

const createAdmin = async () => {
  try {
  
   
    const userName = process.env.ADMIN_NAME;
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

  
    if (!userName || !email || !password) {
      throw new Error("Missing ADMIN_NAME, ADMIN_EMAIL or ADMIN_PASSWORD in .env");
    }

    await connectDB();

    const userExists = await User.findOne({ email });
    if (userExists) {
      
      throw new Error("SUPER_ADMIN already exists with this email");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createdAdmin = await User.create({
      userName,
      email,
      password: hashedPassword,
      role: "SUPER_ADMIN",
    });

    
    console.log("   SUPER_ADMIN created successfully");
    console.log("   Name :", createdAdmin.userName);
    console.log("   Email:", createdAdmin.email);
    console.log("   Role :", createdAdmin.role);

    // exit code 0 = success
    process.exit(0);

  } catch (err) {
    console.error(" Failed to create SUPER_ADMIN:", err.message);
    // exit code 1 = failure
    process.exit(1);
  }
};


createAdmin();