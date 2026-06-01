

const app = require("./app.js");
const connectDB = require("./src/config/db.js");
const { PORT } = require("./src/config/env.js");


const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
    });

  } catch (err) {
    console.log("Server failed");
    console.error(err);
  }
};

startServer();