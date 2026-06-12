const AppError = require("../utils/AppError");

const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      return next(
        new AppError(error.details[0].message, 400)
      );
    }

    req[source] = value;

    next();
  };
};

module.exports = validate;

