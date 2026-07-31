const {getClassDetail,getTeacherClasses } = require("./data.service");
const sendResponse = require("../../utils/response.util");
const catchAsync = require("../../utils/catchAsync");

const classDetail = catchAsync(async (req, res) => {
  const { classId } = req.params;

  const detail = await getClassDetail({ classId }, req.user);

  sendResponse(
    res,
    200,
    "Class detail fetched successfully",
    detail
  );
});

const myClasses = catchAsync(async (req, res) => {
  const classes = await getTeacherClasses(req.user);

  sendResponse(
    res,
    200,
    "Classes fetched successfully",
    classes
  );
});

module.exports = {
  classDetail,
  myClasses,
};

