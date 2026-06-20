const { start, submit,
    qrToken, ends,
    manual, active,
    allSession, teacherSession, getTeacherSessionByHod,
    presentStudents, absentStudents,
    removes } = require("./attendance.controller");

const validate = require("../../middleware/validate.middleware");
const { startAttendanceSchema, submitAttendanceSchema,
    manualAttendanceSchema, SessionSchema,
    classIdParamSchema, todayOnlyQuerySchema, teacherIdSchema, recordIdSchema } = require("./attendance.validator");

const authMiddleware = require("../../middleware/auth.middleware");
const allowOnly = require("../../middleware/role.middleware");
const express = require("express");


const attendanceRouter = express.Router();

attendanceRouter.use(authMiddleware);

//  post methods
attendanceRouter.post("/session/start", validate(startAttendanceSchema), allowOnly("TEACHER"), start);
attendanceRouter.post("/session/submit", validate(submitAttendanceSchema), allowOnly("STUDENT"), submit);
attendanceRouter.post("/session/:sessionId/manual", validate(SessionSchema, "params"), validate(manualAttendanceSchema), allowOnly("TEACHER"), manual);

//patch methods

attendanceRouter.patch("/session/:sessionId/refresh-qr", validate(SessionSchema, "params"), allowOnly("TEACHER"), qrToken);
attendanceRouter.patch("/session/:sessionId/end-session", validate(SessionSchema, "params"), allowOnly("TEACHER"), ends);

//get methods

attendanceRouter.get("/session/active/:classId", validate(classIdParamSchema, "params"), allowOnly("TEACHER", "HOD", "STUDENT"), active);
attendanceRouter.get("/session/all-session/:classId", validate(classIdParamSchema, "params"), validate(todayOnlyQuerySchema, "query"), allowOnly("HOD"), allSession);
attendanceRouter.get("/session/teacher", validate(todayOnlyQuerySchema, "query"), allowOnly("TEACHER"), teacherSession);
attendanceRouter.get("/session/teacher/:teacherId", validate(teacherIdSchema, "params"), validate(todayOnlyQuerySchema, "query"), allowOnly("HOD"), getTeacherSessionByHod);
attendanceRouter.get("/session/:sessionId/present-students", validate(SessionSchema, "params"), allowOnly("TEACHER", "HOD"), presentStudents);
attendanceRouter.get("/session/:sessionId/absent-students", validate(SessionSchema, "params"), allowOnly("TEACHER", "HOD"), absentStudents);

//delete methods

attendanceRouter.delete("/session/:recordId/remove-record", validate(recordIdSchema, "params"), allowOnly("TEACHER"), removes);

module.exports = attendanceRouter;