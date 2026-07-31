// timetable.controller.js
const {
  createTimetableSlot,
  getTimetableByClass,
  getTimetableByTeacher,
  getActiveSlot,
  getActiveSlotByClass,
  updateTimetableSlot,
  deleteTimetableSlot,
} = require("./timetable.service");
const sendResponse = require("../../utils/response.util");
const catchAsync = require("../../utils/catchAsync");

// Defensive: works whether or not the validate middleware writes the
// coerced boolean back onto req.query.
const toBoolean = (value) => value === true || value === "true" || value === "1";

// Shared shape every service call needs for access control —
// pulled into one place instead of retyped in every controller.
const buildRequester = (req) => ({
  id: req.user._id,
  role: req.user.role,
  classId: req.user.classId,
  departmentId: req.user.departmentId,
});

// Create Timetable Slot
const create = catchAsync(async (req, res) => {
  const {
    teacherId,
    subjectId,
    classId,
    room,
    weekDay,
    startTime,
    endTime,
  } = req.body;
  const timetable = await createTimetableSlot({
    teacherId,
    subjectId,
    classId,
    room,
    weekDay,
    startTime,
    endTime,
  });
  sendResponse(res, 201, "Timetable created successfully", timetable);
});

// Get Timetable By Class — explicit classId (HOD) — ?day=, ?today=
const getByClass = catchAsync(async (req, res) => {
  const { classId } = req.params;
  const { day, today } = req.query;
  const timetable = await getTimetableByClass({
    classId,
    day,
    today: toBoolean(today),
    requester: buildRequester(req),
  });
  sendResponse(res, 200, "Timetable fetched successfully", timetable);
});

// Get logged-in student's own class timetable — ?day=, ?today=
const getMyClass = catchAsync(async (req, res) => {
  const { day, today } = req.query;
  const timetable = await getTimetableByClass({
    classId: req.user.classId,
    day,
    today: toBoolean(today),
    requester: buildRequester(req),
  });
  sendResponse(res, 200, "Timetable fetched successfully", timetable);
});

// Get Timetable By Teacher — explicit teacherId (HOD) — ?day=, ?today=
const getByTeachers = catchAsync(async (req, res) => {
  const { teacherId } = req.params;
  const { day, today } = req.query;
  const timetable = await getTimetableByTeacher({
    teacherId,
    day,
    today: toBoolean(today),
    requester: buildRequester(req),
  });
  sendResponse(res, 200, "Timetable fetched successfully", timetable);
});

// Get logged-in teacher's own timetable — ?day=, ?today=
const getMyTeacher = catchAsync(async (req, res) => {
  const { day, today } = req.query;
  const timetable = await getTimetableByTeacher({
    teacherId: req.user._id,
    day,
    today: toBoolean(today),
    requester: buildRequester(req),
  });
  sendResponse(res, 200, "Timetable fetched successfully", timetable);
});

// Get Active Slot For Logged-in Teacher
const getSlots = catchAsync(async (req, res) => {
  const activeSlot = await getActiveSlot(req.user._id);
  sendResponse(
    res,
    200,
    "Active slot fetched successfully",
    activeSlot,
  );
});

// Get Active Slot By Class — explicit classId (HOD)
const getActiveClassSlot = catchAsync(async (req, res) => {
  const { classId } = req.params;
  const activeSlot = await getActiveSlotByClass({
    classId,
    requester: buildRequester(req),
  });
  sendResponse(
    res,
    200,
    "Active class slot fetched successfully",
    activeSlot,
  );
});

// Get logged-in student's own class active slot
const getMyActiveClassSlot = catchAsync(async (req, res) => {
  const activeSlot = await getActiveSlotByClass({
    classId: req.user.classId,
    requester: buildRequester(req),
  });
  sendResponse(
    res,
    200,
    "Active class slot fetched successfully",
    activeSlot,
  );
});

// Update Timetable Slot
const update = catchAsync(async (req, res) => {
  const { slotId } = req.params;
  const updates = req.body;
  const timetable = await updateTimetableSlot(slotId, updates);
  sendResponse(res, 200, "Timetable updated successfully", timetable);
});

// Delete Timetable Slot
const deleteSlot = catchAsync(async (req, res) => {
  const { slotId } = req.params;
  const result = await deleteTimetableSlot(slotId);
  sendResponse(
    res,
    200,
    "Timetable slot deleted successfully",
    result,
  );
});

module.exports = {
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
};