const User = require("../models/User.model.js");   
const AppError = require("../utils/AppError");
const { verifyToken } = require("../utils/jwt.util");

const authMiddleware = async (req, res, next) => { 
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(new AppError("No token provided", 401));
  }

  const token = authHeader.split(" ")[1];

  const decoded = verifyToken(token);
  if (!decoded) {
    return next(new AppError("Invalid token", 401));
  }

  const user = await User.findById(decoded.id);    
  if (!user) {
    return next(new AppError("User not found", 401));
  }

  req.user = user;                               
  next();
};

module.exports = authMiddleware;