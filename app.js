const express = require("express");
const app = express();

const authRouter = require("./src/modules/auth/auth.routes");
const adminRouter = require("./src/modules/admin/admin.routes.js");
const timetableRouter = require("./src/modules/timetable/timetable.routes.js");
const attendanceRouter = require("./src/modules/attendance/attendance.routes.js");
const academicRouter = require("./src/modules/academicRecord/academicRecord.routes.js");
const errorHandler = require("./src/middleware/errorHandler.js");
require("./src/jobs/session.cleanup.job.js"); 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/timetable", timetableRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/academics",academicRouter);

app.use(errorHandler);

module.exports = app;