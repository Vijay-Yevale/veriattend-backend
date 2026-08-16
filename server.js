const http = require("http");
const app = require("./app.js");
const connectDB = require("./src/config/db.js");
const { PORT } = require("./src/config/env.js");
const { initSocket } = require("./src/socket/socket.js");
const { resumeActiveSessionTimers } = require("./src/modules/attendance/attendance.service.js");


const startServer = async () => {
  try {
    await connectDB();

    const httpServer = http.createServer(app);

    initSocket(httpServer);

    // reconnect any session that was mid-class when the server last restarted
    await resumeActiveSessionTimers();

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
    });

  } catch (err) {
    console.log("Server failed");
    console.error(err);
  }
};

startServer();