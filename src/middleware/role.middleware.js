const AppError = require("../utils/AppError");

const allowOnly = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {                        
      return next(new AppError("Access forbidden", 403)); 
                                                         
                                                          
    }
    next();
  };
};

module.exports = allowOnly;