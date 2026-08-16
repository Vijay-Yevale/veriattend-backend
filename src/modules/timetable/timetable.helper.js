const WEEK_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const getCurrentDayAndTime = () => {
  const now = new Date();
  const weekDay = WEEK_DAYS[now.getDay()];
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;
  return { weekDay, time };
};

const attachTodayStatus = (slot, currentDay, currentTime) => {
  const isToday = slot.weekDay === currentDay;
  return {
    ...slot,
    isCompleted: isToday ? slot.endTime <= currentTime : false,
    isCurrent: isToday
      ? slot.startTime <= currentTime && slot.endTime > currentTime
      : false,
    isUpcoming: isToday ? slot.startTime > currentTime : false,
  };
};
const buildTimetableSlot = (slot, { includeTodayStatus = false } = {}) => {
  const base = {
    timetableId: slot._id.toString(),
    teacher: {
      teacherId: slot.teacherId._id.toString(),
      userName: slot.teacherId.userName,
    },
    subject: {
      subjectId: slot.subjectId._id.toString(),
      subjectName: slot.subjectId.subjectName,
      subjectCode: slot.subjectId.subjectCode,
    },
    classInfo: {
      classId: slot.classId._id.toString(),
      className: slot.classId.className,
    },
    room: slot.room,
    weekDay: slot.weekDay,
    startTime: slot.startTime,
    endTime: slot.endTime,
    isActive: slot.isActive,
  };
  if (!includeTodayStatus) return base;
  const { weekDay: currentDay, time: currentTime } = getCurrentDayAndTime();
  return attachTodayStatus(base, currentDay, currentTime);
};
module.exports = {
  buildTimetableSlot,
  getCurrentDayAndTime,
};