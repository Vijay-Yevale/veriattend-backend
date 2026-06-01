const errorHandler = (err, req, res, next) => {


  err.statusCode = err.statusCode || 500;          // ← if no statusCode, default to 500
  err.message = err.message || "Something went wrong";

  // ← handle MongoDB duplicate key error (email/PRN already exists)
  if (err.code === 11000) {                        // ← 11000 is err.code not err.statusCode
    return res.status(409).json({                  // ← res.status() not res.statusCode()
      success: false,
      message: "Duplicate entry, already exists",
    });
  }

  if (err.isOperational) {
    // ← AppError you threw intentionally (wrong password, not found)
    // safe to show message to user
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,                        // ← use err.message, not hardcoded strings
    });
  }

  // ← unknown bug, don't expose internals to user
  return res.status(500).json({
    success: false,
    message: "Something went wrong",
  });
};

module.exports = errorHandler;