const express = require("express");
const { create, getByClass, getByTeachers, getSlots, update, deleteSlot } = require("./timetable.controller");
const { createTimetableSchema,
    getTimetableByClassSchema,
    getTimetableByTeacherSchema,
    slotIdSchema,
    updateTimetableSlotSchema } = require("./timetable.validator");
const authMiddleware = require("../../middleware/auth.middleware");
const validate = require("../../middleware/validate.middleware");
const allowOnly = require("../../middleware/role.middleware");
const timetableRouter = express.Router();

timetableRouter.use(authMiddleware);
timetableRouter.post("/", validate(createTimetableSchema), allowOnly("HOD"), create);
timetableRouter.get("/class/:classId", validate(getTimetableByClassSchema,"params"), allowOnly("HOD", "TEACHER", "STUDENT"), getByClass);
timetableRouter.get("/teacher/:teacherId", validate(getTimetableByTeacherSchema,"params"), allowOnly("HOD", "TEACHER"), getByTeachers);
timetableRouter.get("/active", allowOnly("TEACHER"), getSlots);
timetableRouter.patch("/:slotId", validate(slotIdSchema,"params"), validate(updateTimetableSlotSchema), allowOnly("HOD"), update);
timetableRouter.delete("/:slotId", validate(slotIdSchema,"params"), allowOnly("HOD"), deleteSlot);


module.exports = timetableRouter;