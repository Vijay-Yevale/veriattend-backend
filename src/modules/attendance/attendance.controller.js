const catchAsync = require("../../utils/catchAsync");
const sendResponse = require("../../utils/response.util");
const {
  startSession,
  refreshQr,
  submitAttendance,
  endSession,
  manualAttendance,
  getActiveSession,
  getAllSessions,
  getTeacherSession,
  getSessionAttendance,
  getAbsentStudents,
  removeAttendance
} = require("./attendance.service");

const start = catchAsync(async (req, res) => {
  const { anchorLat, anchorLng } = req.body;
  const session = await startSession({ teacherId: req.user._id, anchorLat, anchorLng });
  sendResponse(res, 200, "Session started successfully", session);
});

const submit = catchAsync(async (req, res) => {
  const { deviceId, studentLat, studentLng, qrToken } = req.body;
  const submitSession = await submitAttendance({ student: req.user, deviceId, studentLat, studentLng, qrToken });
  sendResponse(res, 200, "Attendance submitted successfully", submitSession);
});

const qrToken = catchAsync(async (req, res) => {
  const { sessionId } = req.params;
  const newQr = await refreshQr({ sessionId });
  sendResponse(res, 201, "New QR token generated successfully", newQr);
});

const ends = catchAsync(async (req, res) => {
  const { sessionId } = req.params;
  const endSessions = await endSession({ teacher: req.user, sessionId });
  sendResponse(res, 200, "Session ended successfully", endSessions);
});

const manual = catchAsync(async (req, res) => {
  const { sessionId } = req.params;
  const { studentIds, reason } = req.body;

  const attendance = await manualAttendance({ teacher: req.user, sessionId, studentIds, reason });

  sendResponse(res, 200, "Attendance submitted successfully", attendance);
});

const active = catchAsync(async (req, res) => {
  const { classId } = req.params;
  const activeSession = await getActiveSession({ classId });
  sendResponse(res, 200, "Active session for class fetched successfully", activeSession);
});

const allSession = catchAsync(async (req, res) => {
  const { classId } = req.params;
  const { todayOnly } = req.query;
  const sessions = await getAllSessions({ classId, todayOnly: todayOnly === "true" });
  sendResponse(res, 200, "Sessions for class fetched successfully", sessions);
});

const teacherSession = catchAsync(async (req, res) => {
  const { todayOnly } = req.query;

  const sessions = await getTeacherSession({
    teacherId: req.user._id,
    todayOnly: todayOnly === "true",
  });

  sendResponse(res, 200, "Sessions of teacher fetched successfully", sessions);
});

const getTeacherSessionByHod = catchAsync(async (req, res) => {
  const { teacherId } = req.params;
  const { todayOnly } = req.query;

  

  const sessions = await getTeacherSession({
    teacherId,
    todayOnly: todayOnly === "true",
  });

  sendResponse(res, 200, "Teacher sessions fetched successfully", sessions);
});

const presentStudents = catchAsync(async (req, res) => {
  const { sessionId } = req.params;
  const sessions = await getSessionAttendance({ sessionId });
  sendResponse(res, 200, "Session attendance fetched successfully", sessions);
});

const absentStudents = catchAsync(async (req, res) => {
  const { sessionId } = req.params;
  const sessions = await getAbsentStudents({ sessionId });
  sendResponse(res, 200, "Absent students fetched successfully", sessions);
});

const removes = catchAsync(async (req, res) => {
  const { recordId } = req.params;
  const records = await removeAttendance({ teacherId: req.user._id, recordId });
  sendResponse(res, 200, "Attendance record deleted successfully", records);
});

module.exports = {
  start,
  submit,
  qrToken,
  ends,
  manual,
  active,
  allSession,
  teacherSession,
  getTeacherSessionByHod,
  presentStudents,
  absentStudents,
  removes,
};