const {
    createTimetableSlot,
    getTimetableByClass,
    getTimetableByTeacher,
    getActiveSlot,
    updateTimetableSlot,
    deleteTimetableSlot
} = require("./timetable.service");

const sendResponse = require("../../utils/response.util");
const catchAsync = require("../../utils/catchAsync");



const create = catchAsync(async (req, res) => {
    const {  teacherId, subjectId, classId, room, weekDay, weekType, startTime, endTime  } = req.body;
    const timetable = await createTimetableSlot({ teacherId, subjectId, classId, room, weekDay, weekType, startTime, endTime });
    sendResponse(res, 201, "Timetable created successfully", timetable);
});

const getByClass = catchAsync(async (req, res) => {
    const {classId }= req.params;
    const timetable = await getTimetableByClass(classId );
    sendResponse(res, 200, "Timetable fetched successfully", timetable);
});
const getByTeachers = catchAsync(async(req,res)=>{
    const {teacherId} = req.params;
    const timetable = await getTimetableByTeacher(teacherId);
    sendResponse(res,200,"Timetable fetched successfully",timetable);
});

const getSlots = catchAsync(async(req,res)=>{
      
      const activeSlot = await getActiveSlot(req.user._id);
    sendResponse(res,200,"active Slot fetched successfully",activeSlot);
});
const update = catchAsync(async (req, res) => {
    const {slotId } = req.params;
    const updates = req.body;
    const timetable = await updateTimetableSlot(slotId, updates);
    sendResponse(res, 200, "Timetable updated successfully", timetable);
});

const deleteSlot = catchAsync(async (req, res) => {
    const { slotId} = req.params;
    const result = await deleteTimetableSlot(slotId );
    sendResponse(res, 200, "Timetable slot deleted successfully", result);
});


module.exports = { create,getByClass,getByTeachers,getSlots,update,deleteSlot };