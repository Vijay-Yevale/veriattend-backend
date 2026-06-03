const errorHandler = (err, req, res, next) => {


  err.statusCode = err.statusCode || 500;         
  err.message = err.message || "Something went wrong";

  
  if (err.code === 11000) {                        
    return res.status(409).json({                
      success: false,
      message: "Duplicate entry, already exists",
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