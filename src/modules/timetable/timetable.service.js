
const Timetable = require("../../models/timetable.model");
const User = require("../../models/user.model");
const Subject = require("../../models/subject.model");
const Class = require("../../models/class.model");
const TeacherSubject = require("../../models/teacherSubject.model");
const AppError = require("../../utils/AppError");

const {
  buildTimetableSlot,
  getCurrentDayAndTime,
  isTimeInSlot,
} = require("./timetable.helper");
const createTimetableSlot = async ({ teacherId, subjectId, classId, room, weekDay, startTime, endTime }) => {

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
    room, weekDay,
    startTime, endTime,
  });

  //  Re-fetch populated so the response matches every other endpoint's shape
  const populatedSlot = await Timetable.findById(slot._id)
    .populate("teacherId", "_id userName")
    .populate("subjectId", "_id subjectName subjectCode")
    .populate("classId", "_id className")
    .lean();

  return buildTimetableSlot(populatedSlot);
};


const resolveClassAccess = async ({ classId, requester }) => {
  if (!requester) return classId;

  // Student → only their own class
  if (requester.role === "STUDENT") {
    if (!requester.classId) {
      throw new AppError("Your account is not assigned to a class yet", 403);
    }
    return requester.classId;
  }

  // Teacher → classes they teach a subject in, or classes they're the
  // classTeacher (mentor) for
  if (requester.role === "TEACHER") {
    const [cls, isAssignedSubject] = await Promise.all([
      Class.findById(classId).select("classTeacher"),
      TeacherSubject.exists({ teacherId: requester.id, classId }),
    ]);

    if (!cls) {
      throw new AppError("Class not found", 404);
    }

    const isClassTeacher =
      cls.classTeacher && cls.classTeacher.toString() === requester.id.toString();

    if (!isClassTeacher && !isAssignedSubject) {
      throw new AppError("You are not assigned to this class", 403);
    }

    return classId;
  }

  // HOD → only classes in their department
  if (requester.role === "HOD") {
    if (!requester.departmentId) {
    throw new AppError("Your account has not been assigned a department yet", 403);
  }
    const cls = await Class.findById(classId).select("departmentId");

    if (!cls) {
      throw new AppError("Class not found", 404);
    }

    if (cls.departmentId.toString() !== requester.departmentId.toString()) {
      throw new AppError(
        "You are not authorized to access this class",
        403
      );
    }

    return classId;
  }

  // SUPER_ADMIN
  return classId;
};

// Same IDOR shape as above, applied to /teacher/:teacherId — a TEACHER is
// pinned to their own schedule. HOD is scoped to their own department.
const resolveTeacherAccess = async ({ teacherId, requester }) => {
  if (!requester) return teacherId;

  if (requester.role === "TEACHER") {
    return requester.id;
  }

  if (requester.role === "HOD") {
    if (!requester.departmentId) {
    throw new AppError("Your account has not been assigned a department yet", 403);
  }
    const teacher = await User.findById(teacherId).select("departmentId role");

    if (!teacher || teacher.role !== "TEACHER") {
      throw new AppError("Teacher not found", 404);
    }

    if (teacher.departmentId.toString() !== requester.departmentId.toString()) {
      throw new AppError(
        "You are not authorized to access this teacher",
        403
      );
    }

    return teacherId;
  }

  return teacherId;
};
// today=true pins weekDay to the actual current day (overrides an explicit
// day param).
const buildWeekFilter = ({ day, today }) => {
  const filter = {};

  if (today) {
    filter.weekDay = getCurrentDayAndTime().weekDay;
  } else if (day) {
    filter.weekDay = day;
  }

  return filter;
};

const getTimetableByClass = async ({ classId, day, today, requester }) => {
  const resolvedClassId = await resolveClassAccess({ classId, requester });

  const filter = {
    classId: resolvedClassId,
    isActive: true,
    ...buildWeekFilter({ day, today }),
  };

  const timetable = await Timetable.find(filter)
    .sort({ startTime: 1 })
    .populate("teacherId", "_id userName")
    .populate("subjectId", "_id subjectName subjectCode")
    .populate("classId", "_id className")
    .lean();


  return timetable.map((slot) =>
    buildTimetableSlot(slot, { includeTodayStatus: !!today })
  );
};

const getTimetableByTeacher = async ({ teacherId, day, today, requester }) => {
  const resolvedTeacherId = await resolveTeacherAccess({ teacherId, requester });

  const filter = {
    teacherId: resolvedTeacherId,
    isActive: true,
    ...buildWeekFilter({ day, today }),
  };

  const timetable = await Timetable.find(filter)
    .sort({ startTime: 1 })
    .populate("teacherId", "_id userName")
    .populate("subjectId", "_id subjectName subjectCode")
    .populate("classId", "_id className")
    .lean();

  // Same reasoning as getTimetableByClass — empty is not an error here.
  return timetable.map((slot) =>
    buildTimetableSlot(slot, { includeTodayStatus: !!today })
  );
};

const getActiveSlot = async (teacherId) => {
  const {
    weekDay: currentDay,
    time: currentTime,
  } = getCurrentDayAndTime();

  const slots = await Timetable.find({
    teacherId,
    weekDay: currentDay,
    isActive: true,
  })
    .populate("teacherId", "_id userName")
    .populate("subjectId", "_id subjectName subjectCode")
    .populate("classId", "_id className")
    .lean();

  const activeSlot = slots.find((slot) =>
    isTimeInSlot(
      slot.startTime,
      slot.endTime,
      currentTime
    )
  );

  if (!activeSlot) {
    return null;
  }

  return buildTimetableSlot(activeSlot);
};

const getActiveSlotByClass = async ({
  classId,
  requester,
}) => {
  const resolvedClassId = await resolveClassAccess({
    classId,
    requester,
  });

  const {
    weekDay: currentDay,
    time: currentTime,
  } = getCurrentDayAndTime();

  const slots = await Timetable.find({
    classId: resolvedClassId,
    weekDay: currentDay,
    isActive: true,
  })
    .populate("teacherId", "_id userName")
    .populate("subjectId", "_id subjectName subjectCode")
    .populate("classId", "_id className")
    .lean();

  const activeSlot = slots.find((slot) =>
    isTimeInSlot(
      slot.startTime,
      slot.endTime,
      currentTime
    )
  );

  if (!activeSlot) {
    return null;
  }

  return buildTimetableSlot(activeSlot);
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


  const teacherChanged =
    updates.teacherId !== undefined &&
    updates.teacherId !== slot.teacherId.toString();

  const subjectChanged =
    updates.subjectId !== undefined &&
    updates.subjectId !== slot.subjectId.toString();

  const classChanged =
    updates.classId !== undefined &&
    updates.classId !== slot.classId.toString();

  if (teacherChanged || subjectChanged || classChanged) {
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

  //  Re-fetch populated so the response matches every other endpoint's shape
  const populatedSlot = await Timetable.findById(updated._id)
    .populate("teacherId", "_id userName")
    .populate("subjectId", "_id subjectName subjectCode")
    .populate("classId", "_id className")
    .lean();

  return buildTimetableSlot(populatedSlot);
};

const deleteTimetableSlot = async (slotId) => {
  // Soft delete — attendance history referencing this slot stays intact
  const slot = await Timetable.findByIdAndUpdate(
    slotId,
    { isActive: false },
    { new: true }
  );

  if (!slot) throw new AppError("Timetable slot not found", 404);

  return null;
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