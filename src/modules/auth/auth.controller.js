const catchAsync = require("../utils/catchAsync.js");
const sendResponse = require("../utils/response.util.js");
const { registerUser, loginUser } = require("./auth.service.js");


const register = catchAsync(async (req, res) => {
  const { userName, email, password, role, PRN } = req.body;

  const { user, token } = await registerUser({
    userName,
    email,
    password,
    role,
    PRN,
  });

  sendResponse(res, 201, "User registered successfully", { user, token });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const { user, token } = await loginUser({ email, password });


  sendResponse(res, 200, "Login successful", { user, token });
});

module.exports = { register, login };