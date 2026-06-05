const {
    getTimetable,
    createTimetable,
    updateTimetable,
    deleteTimetableEntry,
    deleteClassTimetable
} = require("./timetable.service");

const sendResponse = require("../../utils/response.util");
const catchAsync = require("../../utils/catchAsync");

const getAll = catchAsync(async (req, res) => {
    const timetable = await getTimetable({ user: req.user });
    sendResponse(res, 200, "Timetable fetched successfully", timetable);
});

const create = catchAsync(async (req, res) => {
    const { classId, teacherId, subjectId, startTime, endTime, room, weekDay, isActive } = req.body;
    const timetable = await createTimetable({ classId, teacherId, subjectId, startTime, endTime, room, weekDay, isActive });
    sendResponse(res, 201, "Timetable created successfully", timetable);
});

const update = catchAsync(async (req, res) => {
    const { timetableId } = req.params;
    const updates = req.body;
    const timetable = await updateTimetable({ timetableId, updates });
    sendResponse(res, 200, "Timetable updated successfully", timetable);
});

const deleteEntry = catchAsync(async (req, res) => {
    const { timetableId } = req.params;
    const result = await deleteTimetableEntry({ timetableId });
    sendResponse(res, 200, "Timetable slot deleted successfully", result);
});

const deleteClass = catchAsync(async (req, res) => {
    const { classId } = req.params;
    const result = await deleteClassTimetable({ classId });
    sendResponse(res, 200, "Class timetable deleted successfully", result);
});

module.exports = { getAll, create, update, deleteEntry, deleteClass };