const {closedExpiredSession} =  require("../modules/attendance/attendance.service");
const cron = require("node-cron");

cron.schedule("* * * * *", async () => {
  try {
    await closedExpiredSession();
  } catch (error) {
    console.error(error);
  }
});