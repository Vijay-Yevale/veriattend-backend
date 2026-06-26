// ── pure utility functions ────────────────────────────────────────────────────

function avg(arr) {
  if (!arr || arr.length === 0) return null;
  return parseFloat(
    (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2)
  );
}

function classesNeededFor75(attended, total) {
  if (total === 0) return 0;
  if (attended / total >= 0.75) return 0;
  const x = Math.ceil((0.75 * total - attended) / 0.25);
  return x > 0 ? x : 0;
}

//  map riskProfiles array to { studentId → riskProfile } 
function createRiskMap(riskProfiles) {
  const map = {};
  for (const r of riskProfiles) {
    map[r.studentId.toString()] = r;
  }
  return map;
}

//  build one student analytics object 
// used by getClassDashboard + getDepartmentDashboard
function buildStudentAnalytics(student, risk) {
  return {
    studentId:            student._id,
    userName:             student.userName,
    PRN:                  student.PRN,
    classId:              student.classId ?? null,
    attendancePercentage: risk?.attendancePercentage ?? null,
    performanceScore:     risk?.performanceScore     ?? null,
    riskLevel:            risk?.riskLevel            ?? null,
    passProbability:      risk?.passProbability      ?? null,
    weakSubjects:         risk?.weakSubjects         ?? [],
    strongSubjects:       risk?.strongSubjects       ?? [],
    lastUpdated:          risk?.lastUpdated          ?? null,
  };
}

//  build summary + filters from mapped student list 
// used by getClassDashboard + getDepartmentDashboard
function buildDashboardSummary(students) {
  const withRisk = students.filter((s) => s.riskLevel !== null);

  const highRisk   = withRisk.filter((s) => s.riskLevel === "HIGH");
  const mediumRisk = withRisk.filter((s) => s.riskLevel === "MEDIUM");
  const lowRisk    = withRisk.filter((s) => s.riskLevel === "LOW");
  const defaulters = withRisk.filter(
    (s) => s.attendancePercentage !== null && s.attendancePercentage < 75
  );

  const avgAttendance = withRisk.length
    ? parseFloat(
        (
          withRisk.reduce((acc, s) => acc + (s.attendancePercentage ?? 0), 0) /
          withRisk.length
        ).toFixed(2)
      )
    : null;

  const avgPerformance = withRisk.length
    ? parseFloat(
        (
          withRisk.reduce((acc, s) => acc + (s.performanceScore ?? 0), 0) /
          withRisk.length
        ).toFixed(2)
      )
    : null;

  return {
    summary: {
      totalStudents:      students.length,
      averageAttendance:  avgAttendance,
      averagePerformance: avgPerformance,
      highRiskCount:      highRisk.length,
      mediumRiskCount:    mediumRisk.length,
      lowRiskCount:       lowRisk.length,
      defaultersCount:    defaulters.length,
    },
    // only IDs in filters — frontend uses these to highlight from students array
    filters: {
      highRisk:   highRisk.map((s) => s.studentId),
      mediumRisk: mediumRisk.map((s) => s.studentId),
      defaulters: defaulters.map((s) => s.studentId),
    },
  };
}

module.exports = {
  avg,
  classesNeededFor75,
  createRiskMap,
  buildStudentAnalytics,
  buildDashboardSummary,
};