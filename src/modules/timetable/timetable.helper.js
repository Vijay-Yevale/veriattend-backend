const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

const getCurrentDayAndTime = () => {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(now);
  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return {
    weekDay: values.weekday,
    time: `${values.hour}:${values.minute}`,
  };
};

const isTimeInSlot = (startTime, endTime, currentTime) => {
  if (startTime <= endTime) {
    return startTime <= currentTime && currentTime < endTime;
  }

  return currentTime >= startTime || currentTime < endTime;
};

const attachTodayStatus = (slot, currentDay, currentTime) => {
  const isToday = slot.weekDay === currentDay;

  const isCurrent = isToday
    ? isTimeInSlot(slot.startTime, slot.endTime, currentTime)
    : false;

  return {
    ...slot,
    isCompleted: isToday && !isCurrent && slot.endTime <= currentTime,
    isCurrent,
    isUpcoming: isToday && !isCurrent && slot.startTime > currentTime,
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

  if (!includeTodayStatus) {
    return base;
  }

  const {
    weekDay: currentDay,
    time: currentTime,
  } = getCurrentDayAndTime();

  return attachTodayStatus(
    base,
    currentDay,
    currentTime
  );
};

module.exports = {
  APP_TIMEZONE,
  getCurrentDayAndTime,
  isTimeInSlot,
  buildTimetableSlot,
};