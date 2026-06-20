const errorHandler = (err, req, res, next) => {
   console.log("ERROR CAUGHT:", err);
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Something went wrong";

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate entry, already exists",
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
    });
  }

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(", "),
    });
  }

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Something went wrong",
  });
};

module.exports = errorHandler;