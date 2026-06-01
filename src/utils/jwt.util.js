const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env.js");


const generateToken = (userId) => {

  return jwt.sign({ id: userId }, JWT_SECRET, {

     expiresIn: "1d",
  });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

module.exports = { generateToken, verifyToken };