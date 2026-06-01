class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;        // ← statuscode → statusCode (camelCase, capital C)
    this.isOperational = true;           // ← moved inside constructor, wrong syntax outside
                                         // isOperation:true is object syntax, not class syntax
    Error.captureStackTrace(this, this.constructor); // ← added, gives clean error stack trace
  }
}

module.exports = AppError;