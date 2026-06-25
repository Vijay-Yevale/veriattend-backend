const Timetable = require("../../models/timetable.model");
const User = require("../../models/user.model");
const Subject = require("../../models/subject.model");
const Class = require("../../models/class.model");
const TeacherSubject = require("../../models/teachersubject.model");
const AppError = require("../../utils/AppError");

const createTimetableSlot = async ({ teacherId, subjectId, classId, room, weekDay, weekType, startTime, endTime }) => {

  const teacher = await User.findById(teacherId);
  if (!teacher || teacher.role !== "TEACHER") {
    throw new AppError("Teacher not found", 404);
  }


  const subject = await Subject.findById(subjectId);
  if (!subject) throw new AppError("Subject not found", 404);


  const classExists = await Class.findById(classId);
  if (!classExists) throw new AppError("Class not found", 404);


  const assignment = await TeacherSubject.findOne({ teacherId, subjectId, classId });
  if (!assignment) {
    throw new AppError("Teacher is not assigned to this subject and class. Assign first.", 400);
  }

  //  Teacher conflict -overlap check
  const teacherConflict = await Timetable.findOne({
    teacherId,
    weekDay,
    isActive: true,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });
  if (teacherConflict) throw new AppError("Teacher already has a class at this time", 409);

  //  Class conflict — same class can't have two subjects at same time
  const classConflict = await Timetable.findOne({
    classId,
    weekDay,
    isActive: true,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });
  if (classConflict) throw new AppError("Class already has a subject at this time", 409);

  const slot = await Timetable.create({
    teacherId, subjectId, classId,
    room, weekDay, weekType,
    startTime, endTime,
  });

  return slot;
};

const getTimetableByClass = async (classId) => {
  const timetable = await Timetable.find({ classId, isActive: true })
    .populate("teacherId", "userName")
    .populate("subjectId", "subjectName subjectCode")
    .populate("classId", "className");

  if (!timetable.length) throw new AppError("No timetable found for this class", 404);

  return timetable;
};

const getTimetableByTeacher = async (teacherId) => {
  const timetable = await Timetable.find({ teacherId, isActive: true })
    .populate("subjectId", "subjectName subjectCode")
    .populate("classId", "className");

  if (!timetable.length) throw new AppError("No timetable found for this teacher", 404);

  return timetable;
};



const getActiveSlot = async (teacherId) => {
  const now = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDay = days[now.getDay()];
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const slot = await Timetable.findOne({
    teacherId,
    weekDay: currentDay,
    startTime: { $lte: currentTime },
    endTime: { $gte: currentTime },
    isActive: true,
  });

  if (!slot) throw new AppError("No active class right now", 404);

  return slot;
};

const getActiveSlotByClass = async (classId) => {
  const now = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDay = days[now.getDay()];
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const slot = await Timetable.findOne({
    classId,
    weekDay: currentDay,
    startTime: { $lte: currentTime },
    endTime: { $gte: currentTime },
    isActive: true,
  });

  if (!slot) throw new AppError("No active class right now", 404);
  return slot;
};

const updateTimetableSlot = async (slotId, updates) => {
  //  Get current slot
  const slot = await Timetable.findById(slotId);
  if (!slot) throw new AppError("Timetable slot not found", 404);

  //  Merge updates with current values for conflict check
  const merged = {
    teacherId: updates.teacherId || slot.teacherId,
    classId: updates.classId || slot.classId,
    weekDay: updates.weekDay || slot.weekDay,
    startTime: updates.startTime || slot.startTime,
    endTime: updates.endTime || slot.endTime,
  };

  //  If teacher changed
  if (updates.teacherId) {
    const teacher = await User.findById(updates.teacherId);
    if (!teacher || teacher.role !== "TEACHER") {
      throw new AppError("Teacher not found", 404);
    }
  }

  //  If assignment-related fields changed, re-check TeacherSubject
  if (updates.teacherId || updates.subjectId || updates.classId) {
    const assignment = await TeacherSubject.findOne({
      teacherId: merged.teacherId,
      subjectId: updates.subjectId || slot.subjectId,
      classId: merged.classId,
    });
    if (!assignment) {
      throw new AppError("Teacher is not assigned to this subject and class. Assign first.", 400);
    }
  }

  //  Teacher conflict —
  const teacherConflict = await Timetable.findOne({
    _id: { $ne: slotId },
    teacherId: merged.teacherId,
    weekDay: merged.weekDay,
    isActive: true,
    startTime: { $lt: merged.endTime },
    endTime: { $gt: merged.startTime },
  });
  if (teacherConflict) throw new AppError("Teacher already has a class at this time", 409);

  //  Class conflict
  const classConflict = await Timetable.findOne({
    _id: { $ne: slotId },
    classId: merged.classId,
    weekDay: merged.weekDay,
    isActive: true,
    startTime: { $lt: merged.endTime },
    endTime: { $gt: merged.startTime },
  });
  if (classConflict) throw new AppError("Class already has a subject at this time", 409);

  const updated = await Timetable.findByIdAndUpdate(
    slotId,
    { $set: updates },
    { new: true, runValidators: true }
  );

  return updated;
};

const deleteTimetableSlot = async (slotId) => {
  // Soft delete — attendance history referencing this slot stays intact
  const slot = await Timetable.findByIdAndUpdate(
    slotId,
    { isActive: false },
    { new: true }
  );

  if (!slot) throw new AppError("Timetable slot not found", 404);

  return slot;
};

module.exports = {
  createTimetableSlot,
  getTimetableByClass,
  getTimetableByTeacher,
  getActiveSlot,
  getActiveSlotByClass,
  updateTimetableSlot,
  deleteTimetableSlot,
};