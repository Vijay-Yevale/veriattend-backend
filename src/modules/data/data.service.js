const Class = require("../../models/class.model");
const Subject = require("../../models/subject.model");
const TeacherSubject = require("../../models/teachersubject.model");

// GET CLASS DETAIL

const getClassDetail = async ({ classId }, user) => {
  const classDetail = await Class.findById(classId)
    .populate("classTeacherId", "_id userName")
    .select("className departmentId academicYear semester classTeacherId");

  if (!classDetail) {
    throw new AppError("Class not found", 404);
  }

  if (classDetail.departmentId.toString() !== user.departmentId.toString()) {
    throw new AppError("You are not authorized to access this class", 403);
  }

  return classDetail;
};

const getTeacherClasses = async (currentUser) => {
  const teacherId = currentUser._id;

  const [classTeacherClasses, subjectAssignments] = await Promise.all([
    Class.find(
      { classTeacherId: teacherId },
      "className departmentId academicYear semester"
    ).lean(),

    TeacherSubject.find({ teacherId, isActive: true })
      .populate("classId", "className departmentId academicYear semester")
      .populate("subjectId", "subjectName subjectCode")
      .lean(),
  ]);

  const classMap = new Map();

  for (const cls of classTeacherClasses) {
    classMap.set(cls._id.toString(), {
      classId: cls._id,
      className: cls.className,
      departmentId: cls.departmentId,
      academicYear: cls.academicYear,
      semester: cls.semester,
      isClassTeacher: true,
      subjects: [],
    });
  }

  for (const assignment of subjectAssignments) {
    const cls = assignment.classId;
    if (!cls || !assignment.subjectId) continue; // guard stale refs

    const key = cls._id.toString();

    if (!classMap.has(key)) {
      classMap.set(key, {
        classId: cls._id,
        className: cls.className,
        departmentId: cls.departmentId,
        academicYear: cls.academicYear,
        semester: cls.semester,
        isClassTeacher: false,
        subjects: [],
      });
    }

    classMap.get(key).subjects.push({
      subjectId: assignment.subjectId._id,
      subjectName: assignment.subjectId.subjectName,
      subjectCode: assignment.subjectId.subjectCode,
    });
  }

  const classes = Array.from(classMap.values());

  classes.sort((a, b) => {
    if (a.isClassTeacher !== b.isClassTeacher) return a.isClassTeacher ? -1 : 1;
    return a.className.localeCompare(b.className);
  });

  return classes;
};

module.exports = {
  getClassDetail,
  getTeacherClasses,
};