const { Server } = require("socket.io");
const { verifyToken } = require("../utils/jwt.util");
const User = require("../models/user.model");
const Session = require("../models/attendancesession.model");

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*", 
    },
  });

  // Authenticate every socket connection.
  
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("No token provided"));
      }

      const decoded = verifyToken(token);

      if (!decoded) {
        return next(new Error("Invalid or expired token"));
      }

      const user = await User.findById(decoded.id).lean();

      if (!user) {
        return next(new Error("User no longer exists"));
      }

      socket.user = user;

      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(
      `Socket connected: ${socket.user.userName} (${socket.user.role})`
    );

    // Only the teacher who owns the session may receive live QR updates.
    socket.on("join-session", async (sessionId) => {
      if (!sessionId) {
        socket.emit("JOIN_DENIED", {
          message: "Session ID is required",
        });
        return;
      }

      try {
        const session = await Session.findById(sessionId)
          .select("teacherId")
          .lean();

        if (!session) {
          socket.emit("JOIN_DENIED", {
            message: "Session not found",
          });
          return;
        }

        const isOwner =
          socket.user.role === "TEACHER" &&
          session.teacherId.toString() === socket.user._id.toString();

        if (!isOwner) {
          socket.emit("JOIN_DENIED", {
            message: "You are not authorized to join this session",
          });
          return;
        }

        await socket.join(`session:${sessionId}`);

        console.log(
          `${socket.user.userName} joined session ${sessionId}`
        );

        socket.emit("JOIN_SUCCESS", {
          sessionId,
        });
      } catch (err) {
        console.error("join-session failed:", err);

        socket.emit("JOIN_DENIED", {
          message: "Unable to join session",
        });
      }
    });

    socket.on("leave-session", (sessionId) => {
      if (!sessionId) return;

      socket.leave(`session:${sessionId}`);

      console.log(
        `${socket.user.userName} left session ${sessionId}`
      );
    });

    socket.on("disconnect", (reason) => {
      console.log(
        `Socket disconnected: ${socket.user.userName} (${reason})`
      );
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error(
      "Socket.io not initialized. Call initSocket(server) first."
    );
  }

  return io;
};

module.exports = {
  initSocket,
  getIO,
};