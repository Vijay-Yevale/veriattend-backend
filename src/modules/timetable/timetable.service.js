const Timetable = require("../../models/timetable.model");
const AppError = require("../../utils/AppError");

// user object comes in so service knows which query to build
const getTimetable = async ({ user }) => {
    let timetable;

    if (user.role === "admin") {
        timetable = await Timetable.find();
    } else if (user.role === "teacher") {
        timetable = await Timetable.find({ teacherId: user._id });
    } else if (user.role === "student") {
        timetable = await Timetable.find({ classId: user.classId });
    }

    // find() returns [] not null — check length
    if (!timetable || timetable.length === 0) {
        throw new AppError("No timetable found", 404);
    }

    return timetable;
};

const createTimetable = async ({ classId, teacherId, subjectId, startTime, endTime, room, weekDay, isActive }) => {
    
    // same class + same day + same time = duplicate slot
    const timetableExists = await Timetable.findOne({ classId, weekDay, startTime });
    if (timetableExists) {
        throw new AppError("Timetable slot already exists", 409);
    }

    const timetable = await Timetable.create({
        teacherId, subjectId, classId,
        startTime, endTime, room,
        weekDay, isActive
    });

    return timetable;
};

const updateTimetable = async ({ timetableId, updates }) => {
    
    // findByIdAndUpdate — finds by _id, applies only changed fields via $set
    // new: true → returns updated document not old one
    // runValidators → runs schema rules on new values
    const timetable = await Timetable.findByIdAndUpdate(
        timetableId,
        { $set: updates },
        { new: true, runValidators: true }
    );

    if (!timetable) {
        throw new AppError("Timetable entry not found", 404);
    }

    return timetable;
};

const deleteTimetableEntry = async ({ timetableId }) => {
    
    // findByIdAndDelete — finds by _id and removes that one document
    // returns the deleted document as confirmation
    const deleted = await Timetable.findByIdAndDelete(timetableId);

    if (!deleted) {
        throw new AppError("Timetable entry not found", 404);
    }

    return deleted;
};

const deleteClassTimetable = async ({ classId }) => {
    
    // deleteMany — removes ALL documents matching the filter
    // returns { deletedCount: N } not the documents themselves
    const result = await Timetable.deleteMany({ classId });

    if (result.deletedCount === 0) {
        throw new AppError("No timetable found for this class", 404);
    }

    return result; // { deletedCount: 5 }
};

module.exports = { 
    getTimetable, 
    createTimetable, 
    updateTimetable, 
    deleteTimetableEntry, 
    deleteClassTimetable 
};