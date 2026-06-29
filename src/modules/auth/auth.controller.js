const catchAsync = require("../../utils/catchAsync");
const sendResponse = require("../../utils/response.util");

const {
  registerUser,
  loginUser,
  getMe
} = require("./auth.service");


// REGISTER


const register = catchAsync(
  async (req, res) => {
    
    const {
      userName,
      email,
      password,
      PRN,
    } = req.body;
  
    const {
      user,
      token,
    } = await registerUser({
      userName,
      email,
      password,
      PRN,
    });
 
    sendResponse(
      res,
      201,
      "User registered successfully",
      {
        user,
        token,
      }
    );
  }
);


// LOGIN


const login = catchAsync(
  async (req, res) => {
    const { email, password} = req.body;

    const {
      user,
      token,
    } = await loginUser({
      email,
      password,
    });

    sendResponse(
      res,
      200,
      "Login successful",
      {
        user,
        token,
      }
    );
  }
);

const getUser = catchAsync(async(req,res)=>{
  const userId = req.user._id;
  const user = await getMe({userId});
  sendResponse(res,200,"user fetch successfully",user);
});

module.exports = {
  register,
  login,
  getUser
};