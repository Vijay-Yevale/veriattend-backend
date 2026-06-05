const AppError = require("../utils/AppError");

const allowOnly = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError("Access forbidden", 403));
    }

    next();
  };
};

module.exports = allowOnly;