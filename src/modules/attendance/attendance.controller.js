const catchAsync = require("../../utils/catchAsync");
const sendResponse = require("../../utils/response.util");
const {
  startSession,
  refreshQr,
  submitAttendance,
  verifyFaceAndMarkAttendance,
  endSession,
  manualAttendance,
  getActiveSession,
  getAllSessions,
  getTeacherSession,
  getSessionAttendance,
  getAbsentStudents,
  getSessionReview,
  getLiveSummary,
  removeAttendance,
} = require("./attendance.service");

// Same shape as timetable.controller.js's buildRequester — getActiveSession
// forwards this into getActiveSlotByClass for access resolution.
const buildRequester = (req) => ({
  id: req.user._id,
  role: req.user.role,
  classId: req.user.classId,
  departmentId: req.user.departmentId,
});

const start = catchAsync(async (req, res) => {
  const { anchorLat, anchorLng } = req.body;
  const session = await startSession({ teacherId: req.user._id, anchorLat, anchorLng });
  sendResponse(res, 200, "Session started successfully", session);
});

// STAGE 1 — QR + GPS only. Returns a verificationToken; no Record is
// created here
const submit = catchAsync(async (req, res) => {
  const { deviceId, studentLat, studentLng, qrToken } = req.body;

  const submitResult = await submitAttendance({
    student: req.user,
    deviceId,
    studentLat,
    studentLng,
    qrToken,
  });

  sendResponse(res, 200, "QR and location verified, proceed to face verification", submitResult);
});

// STAGE 2 — takes the verificationToken from stage 1 plus a live face
// embedding. 
const verifyFace = catchAsync(async (req, res) => {
  const { verificationToken, embedding } = req.body;

  const record = await verifyFaceAndMarkAttendance({
    student: req.user,
    verificationToken,
    embedding,
  });

  sendResponse(res, 201, "Attendance marked successfully", record);
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
  const activeSession = await getActiveSession({ classId, requester: buildRequester(req) });
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

// Unified roster: present + absent + search, in one call.

const review = catchAsync(async (req, res) => {
  const { sessionId } = req.params;
  const { search } = req.query;

  const reviewData = await getSessionReview({ sessionId, search });

  sendResponse(res, 200, "Session review fetched successfully", reviewData);
});

// Lightweight present/absent counts for a live-updating teacher dashboard.
const live = catchAsync(async (req, res) => {
  const { sessionId } = req.params;
  const summary = await getLiveSummary({ sessionId });
  sendResponse(res, 200, "Live session summary fetched successfully", summary);
});

const removes = catchAsync(async (req, res) => {
  const { recordId } = req.params;
  const records = await removeAttendance({ teacherId: req.user._id, recordId });
  sendResponse(res, 200, "Attendance record deleted successfully", records);
});

module.exports = {
  start,
  submit,
  verifyFace,
  qrToken,
  ends,
  manual,
  active,
  allSession,
  teacherSession,
  getTeacherSessionByHod,
  presentStudents,
  absentStudents,
  review,
  live,
  removes,
};