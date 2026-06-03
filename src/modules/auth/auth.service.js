const User = require("../../models/User.model.js");      
const AppError = require("../../utils/AppError.js");     
const bcrypt = require("bcryptjs");                      
const { generateToken } = require("../../utils/jwt.util.js");
const registerUser = async ({ userName, email, password, role, PRN }) => {

  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new AppError("User already exists", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    userName,
    email,
    password: hashedPassword,
    role,
    PRN,
  });

  newUser.password = undefined;

  const token = generateToken(newUser._id);

  return { user: newUser, token };
};

const loginUser = async ({ email, password }) => {

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError("Invalid email or password", 401);
  }

  user.password = undefined;

  const token = generateToken(user._id);
  return { user, token };
};

module.exports = { registerUser, loginUser };