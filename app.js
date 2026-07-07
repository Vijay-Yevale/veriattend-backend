const express    = require("express");
const rateLimit  = require("express-rate-limit");
const helmet     = require("helmet");
const cors       = require("cors");
const app        = express();

//  routers 
const authRouter       = require("./src/modules/auth/auth.routes");
const adminRouter      = require("./src/modules/admin/admin.routes.js");
const timetableRouter  = require("./src/modules/timetable/timetable.routes.js");
const attendanceRouter = require("./src/modules/attendance/attendance.routes.js");
const academicRouter   = require("./src/modules/academicRecord/academicRecord.routes.js");
const analyticsRouter  = require("./src/modules/analytics/analytics.routes.js");
const errorHandler     = require("./src/middleware/errorHandler.js");

//  jobs 
require("./src/jobs/session.cleanup.job.js");
const { scheduleAnalyticsJob }    = require("./src/jobs/analytics.job.js");
const { scheduleTeacherNotifyJob } = require("./src/jobs/teacherNotify.job.js");

scheduleAnalyticsJob();
scheduleTeacherNotifyJob();

//  rate limiters
const globalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             100,
  message:         { success: false, message: "Too many requests, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders:   false,
});

const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  message:         { success: false, message: "Too many login attempts, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders:   false,
});

const sanitizeInput = (obj) => {
  for (const key in obj) {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      sanitizeInput(obj[key]);
    }
  }
};

//  middleware 
app.use(helmet());
app.use(cors());

// Body parsers must run BEFORE sanitizeInput, or req.body is still
// undefined when sanitizeInput checks it — nothing gets sanitized.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.body)   sanitizeInput(req.body);
  if (req.params) sanitizeInput(req.params);
  next();
});

app.use(globalLimiter);
app.use("/api/auth/login", authLimiter);

//  routes 
app.use("/api/auth",       authRouter);
app.use("/api/admin",      adminRouter);
app.use("/api/timetable",  timetableRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/academics",  academicRouter);
app.use("/api/analytics",  analyticsRouter);

//  error handler 
app.use(errorHandler);

module.exports = app;