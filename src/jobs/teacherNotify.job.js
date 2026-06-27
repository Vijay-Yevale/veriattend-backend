const cron      = require("node-cron");
const Timetable = require("../models/timetable.model");


// resets at midnight via cron
const notifiedSlots = new Set();


const toMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};


const teacherScheduleJob = async () => {
  const date = new Date();

 
  const days      = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayName = days[date.getDay()];

  
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const targetMinutes  = currentMinutes + 5;

  const slots = await Timetable.find({ weekDay: todayName, isActive: true })
    .populate("teacherId", "userName email")
    .populate("subjectId", "subjectName")
    .populate("classId",   "className")
    .lean();

  if (!slots.length) return;

  
  const upcomingSlots = slots.filter((slot) => {
    const slotMinutes = toMinutes(slot.startTime);
    const key         = `${slot._id}-${date.toDateString()}`;

    // already notified today → skip
    if (notifiedSlots.has(key)) return false;

    // falls in next 5 minute window → notify
    if (slotMinutes >= currentMinutes && slotMinutes <= targetMinutes) {
      notifiedSlots.add(key); // mark as notified
      return true;
    }

    return false;
  });

  if (!upcomingSlots.length) return;

  // notify each teacher
  for (const slot of upcomingSlots) {
    console.log(
      `[TeacherNotify] 🔔 ${slot.teacherId.userName} → ` +
      `${slot.subjectId.subjectName} starts at ${slot.startTime} ` +
      `in class ${slot.classId.className}`
    );

    // remaining actual push notification 
  }
};

//  schedule 
const scheduleTeacherNotifyJob = () => {

  // runs every 5 minutes between 7AM and 7PM, Monday to Saturday
  cron.schedule("*/5 7-19 * * 1-6", async () => {
    await teacherScheduleJob();
  });

  // resets notifiedSlots at midnight every day — fresh start for next day
  cron.schedule("0 0 * * *", () => {
    notifiedSlots.clear();
    console.log("[TeacherNotify] Notification set cleared for new day");
  });

  console.log("[TeacherNotify] Scheduled — every 5 min (7AM-7PM, Mon-Sat)");
};

module.exports = { scheduleTeacherNotifyJob };