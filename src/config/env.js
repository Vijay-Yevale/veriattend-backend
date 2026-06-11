const dotenv = require("dotenv");
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 5000;




if (!MONGO_URI) throw new Error("MONGO_URI is missing in .env");
if (!JWT_SECRET) throw new Error("JWT_SECRET is missing in .env");

module.exports = { MONGO_URI, JWT_SECRET, PORT };