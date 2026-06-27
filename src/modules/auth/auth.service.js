const User = require("../../models/user.model");
const Department = require("../../models/department.model");

const AppError = require("../../utils/AppError");
const bcrypt = require("bcryptjs");

const { generateToken } = require("../../utils/jwt.util");


// REGISTER USER

const registerUser = async ({
  userName,
  email,
  password,
  PRN,
}) => {
  if (!PRN) {
    throw new AppError(
      "PRN is required",
      400
    );
  }

  const normalizedPRN =
    PRN.trim().toUpperCase();



  const emailExists =await User.findOne({   email });

  if (emailExists) {
    throw new AppError(
      "User already exists with this email",
      409
    );
  }

 

  const prnExists =
    await User.findOne({
      PRN: normalizedPRN,
    });

  if (prnExists) {
    throw new AppError(
      "User already exists with this PRN",
      409
    );
  }

  // Example:
  // RBT23CS130 -> CS

  const match =
    normalizedPRN.match(
      /^RBT\d{2}([A-Z]+)\d+$/
    );

  if (!match) {
    throw new AppError(
      "Invalid PRN format",
      400
    );
  }

  const deptCode = match[1];

  const department =
    await Department.findOne({
      code: deptCode,
    });
   

  if (!department) {
    throw new AppError(
      "Department not found for PRN code",
      400
    );
  }

  const hashedPassword =
    await bcrypt.hash(
      password,
      10
    );

  const newUser =
    await User.create({
      userName: userName.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,

      role: "STUDENT",

      PRN: normalizedPRN,

      departmentId:
        department._id,

     

      classId: null,
    });

  newUser.password =
    undefined;

  const token =
    generateToken(
      newUser._id
    );

  return {
    user: newUser,
    token,
  };
};

// LOGIN USER
const loginUser = async ({
  email,
  password,
}) => {

    if (typeof email !== "string" || typeof password !== "string") {
    throw new AppError("Invalid credentials", 400);
  }
  const user =
    await User.findOne({
      email:
        email.trim().toLowerCase(),
    }).select("+password");

  if (!user) {
    throw new AppError(
      "Invalid email or password",
      401
    );
  }

  const isMatch =
    await bcrypt.compare(
      password,
      user.password
    );

  if (!isMatch) {
    throw new AppError(
      "Invalid email or password",
      401
    );
  }

  user.password =
    undefined;

  const token =
    generateToken(
      user._id
    );

  return {
    user,
    token,
  };
};

module.exports = {
  registerUser,
  loginUser,
};
