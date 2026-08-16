const dotenv = require("dotenv");

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const ATTENDANCE_VERIFICATION_SECRET =
  process.env.ATTENDANCE_VERIFICATION_SECRET;

const PORT = process.env.PORT || 5000;

const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL || "http://localhost:5001";


// Required environment variables


if (!MONGO_URI) {
  throw new Error("MONGO_URI is missing in .env");
}

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in .env");
}

if (!ATTENDANCE_VERIFICATION_SECRET) {
  throw new Error(
    "ATTENDANCE_VERIFICATION_SECRET is missing in .env"
  );
}

module.exports = {
  MONGO_URI,
  JWT_SECRET,
  ATTENDANCE_VERIFICATION_SECRET,
  PORT,
  ML_SERVICE_URL,
};