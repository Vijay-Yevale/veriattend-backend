const express = require("express");
const {getAll, create, update, deleteEntry, deleteClass } = require("./timetable.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const allowOnly = require("../../middleware/role.middleware");
const timetableRouter = express.Router();

timetableRouter.get("/getall",authMiddleware,allowOnly("admin","teacher","student"),getAll);


timetableRouter.post("/create",authMiddleware,allowOnly("admin"),create);
timetableRouter.patch("/update/:timetableId",authMiddleware,allowOnly("admin"), update);
timetableRouter.delete("/deleteEntry/:timetableId",authMiddleware,allowOnly("admin"), deleteEntry);
timetableRouter.delete("/deleteClass/:classId",authMiddleware,allowOnly("admin") ,deleteClass);

module.exports = timetableRouter;