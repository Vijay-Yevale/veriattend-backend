const catchAsync = require("../../utils/catchAsync");
const sendResponse = require("../../utils/response.util");

const {
    createDepartment,
    createHod,
    createTeacher,
    createClass,
    createSubject,
    assignClassToStudent,
    assignTeacherToSubject,

    getAllDepartments,
    getTeachers,
    getClasses,
    getSubjects,
    getPendingStudents,
    getStudentsByClass,
} = require("./admin.service");


// CREATE DEPARTMENT


const department = catchAsync(async (req, res) => {
    const { name, code } = req.body;

    const newDepartment =
        await createDepartment({
            name,
            code,
        });

    sendResponse(
        res,
        201,
        "Department created successfully",
        newDepartment
    );
});

// CREATE HOD

const hod = catchAsync(async (req, res) => {
    const {
        userName,
        email,
        password,
        departmentId,
    } = req.body;

    const newHod = await createHod({
        userName,
        email,
        password,
        departmentId,
    });

    sendResponse(
        res,
        201,
        "HOD created successfully",
        newHod
    );
});

// CREATE TEACHER

const teacher = catchAsync(async (req, res) => {
    const {
        userName,
        email,
        password,
    } = req.body;

    const newTeacher =
        await createTeacher(
            {
                userName,
                email,
                password,
            },
            req.user
        );

    sendResponse(
        res,
        201,
        "Teacher created successfully",
        newTeacher
    );
});

// CREATE CLASS

const classes = catchAsync(async (req, res) => {
    const {
        className,
        academicYear,
        semester,
    } = req.body;

    const newClass =
        await createClass(
            {
                className,
                academicYear,
                semester,
            },
            req.user
        );

    sendResponse(
        res,
        201,
        "Class created successfully",
        newClass
    );
});

// CREATE SUBJECT

const subject = catchAsync(async (req, res) => {
    const {
        subjectName,
        subjectCode,
        semester,
    } = req.body;

    const newSubject =
        await createSubject(
            {
                subjectName,
                subjectCode,
                semester,
            },
            req.user
        );

    sendResponse(
        res,
        201,
        "Subject created successfully",
        newSubject
    );
});

// ASSIGN STUDENT TO CLASS


const bulkAssignStudents = catchAsync(async (req, res) => {
  const { classId, studentIds } = req.body;
  const result = await bsulkAssignClassToStudents({ classId, studentIds }, req.user);
  sendResponse(res, 200, "Students assigned to class", result);
});

// ASSIGN TEACHER TO SUBJECT

const assignTeacher =
    catchAsync(async (req, res) => {
        const {
            teacherId,
            subjectId,
            classId,
        } = req.body;

        const assignment =
            await assignTeacherToSubject({
                teacherId,
                subjectId,
                classId,
            });

        sendResponse(
            res,
            201,
            "Teacher assigned to subject successfully",
            assignment
        );
    });


// GET ALL DEPARTMENTS


const getDepartments =
    catchAsync(async (req, res) => {
        const departments =
            await getAllDepartments();

        sendResponse(
            res,
            200,
            "Departments fetched successfully",
            departments
        );
    });


    // GET DEPARMTENT DETAILS
    const departmentDetails = catchAsync(async (req, res) => {
  const { departmentId } = req.params;

  const department =
    await getDepartmentDetails(departmentId);

  sendResponse(
    res,
    200,
    "Department details fetched successfully",
    department
  );
});

// GET TEACHERS (HOD'S DEPARTMENT)


const getTeacher =
    catchAsync(async (req, res) => {
        const teachers =
            await getTeachers(
                req.user
            );

        sendResponse(
            res,
            200,
            "Teachers fetched successfully",
            teachers
        );
    });


// GET CLASSES (HOD'S DEPARTMENT)


const getClass =
    catchAsync(async (req, res) => {
        const classList =
            await getClasses(
                req.user
            );

        sendResponse(
            res,
            200,
            "Classes fetched successfully",
            classList
        );
    });


// GET SUBJECTS (HOD'S DEPARTMENT)

const getSubject =
    catchAsync(async (req, res) => {
        const subjects =
            await getSubjects(
                req.user
            );

        sendResponse(
            res,
            200,
            "Subjects fetched successfully",
            subjects
        );
    });


// GET PENDING STUDENTS


const pendingStudents =
    catchAsync(async (req, res) => {
        const students =
            await getPendingStudents(
                req.user
            );

        sendResponse(
            res,
            200,
            "Pending students fetched successfully",
            students
        );
    });


// GET STUDENTS BY CLASS


const studentsByClass =
    catchAsync(async (req, res) => {
        const { classId } =
            req.params;

        const students =
            await getStudentsByClass(
                classId
            );

        sendResponse(
            res,
            200,
            "Students fetched successfully",
            students
        );
    });

module.exports = {
    // CREATE
    department,
    hod,
    teacher,
    classes,
    subject,

    // ASSIGN
    bulkAssignStudents,
    assignTeacher,

    // GET
    getDepartments,
    departmentDetails,
    getTeacher,
    getClass,
    getSubject,
    pendingStudents,
    studentsByClass,
};