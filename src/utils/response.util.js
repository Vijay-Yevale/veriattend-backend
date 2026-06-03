const sendResponse = (res, statusCode, message, data = null) => {  // ← added = null as default
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

module.exports = sendResponse;