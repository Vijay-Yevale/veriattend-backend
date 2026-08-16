
const express = require("express");
const {
  create,
  getByClass,
  getMyClass,
  getByTeachers,
  getMyTeacher,
  getSlots,
  getActiveClassSlot,
  getMyActiveClassSlot,
  update,
  deleteSlot,
} = require("./timetable.controller");
const {
  createTimetableSchema,
  getTimetableByClassSchema,
  getTimetableByTeacherSchema,
  timetableQuerySchema,
  slotIdSchema,
  updateTimetableSlotSchema,
} = require("./timetable.validator");
const authMiddleware = require("../../middleware/auth.middleware");
const validate = require("../../middleware/validate.middleware");
const allowOnly = require("../../middleware/role.middleware");
const timetableRouter = express.Router();
timetableRouter.use(authMiddleware);

// Create
timetableRouter.post(
  "/",
  validate(createTimetableSchema),
  allowOnly("HOD"),
  create
);


timetableRouter.get(
  "/class",
  validate(timetableQuerySchema, "query"),
  allowOnly("STUDENT"),
  getMyClass
);


timetableRouter.get(
  "/class/active",
  allowOnly("STUDENT"),
  getMyActiveClassSlot
);


timetableRouter.get(
  "/class/:classId",
  validate(getTimetableByClassSchema, "params"),
  validate(timetableQuerySchema, "query"),
  allowOnly("HOD", "TEACHER"),
  getByClass
);

// Current active slot for an explicit class — same access rule as above.
timetableRouter.get(
  "/class/:classId/active",
  validate(getTimetableByClassSchema, "params"),
  allowOnly("HOD", "TEACHER"),
  getActiveClassSlot
);

//  Teacher 

// Logged-in teacher's own timetable — ?day=, ?today=
timetableRouter.get(
  "/teacher",
  validate(timetableQuerySchema, "query"),
  allowOnly("TEACHER"),
  getMyTeacher
);

// Get timetable for an explicit teacher — HOD only.
timetableRouter.get(
  "/teacher/:teacherId",
  validate(getTimetableByTeacherSchema, "params"),
  validate(timetableQuerySchema, "query"),
  allowOnly("HOD"),
  getByTeachers
);

// Current active slot for logged-in teacher
timetableRouter.get(
  "/active",
  allowOnly("TEACHER"),
  getSlots
);



// Update
timetableRouter.patch(
  "/:slotId",
  validate(slotIdSchema, "params"),
  validate(updateTimetableSlotSchema),
  allowOnly("HOD"),
  update
);

// Delete
timetableRouter.delete(
  "/:slotId",
  validate(slotIdSchema, "params"),
  allowOnly("HOD"),
  deleteSlot
);

module.exports = timetableRouter;