const catchAsync = (fn) => {          // ← takes fn (the async function) as argument
  return (req, res, next) => {        // ← returns a new function Express can call
    Promise.resolve(fn(req, res, next)).catch(next); // ← Promise capital P, no err parameter
  };
};

module.exports = catchAsync;