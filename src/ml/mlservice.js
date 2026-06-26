const axios = require("axios");
const {ML_SERVICE_URL} = require("./../config/env");

//  rule-based fallback when Flask is down 
function _fallbackRisk(attendancePercentage, performanceScore) {
  if (attendancePercentage < 75 || performanceScore < 50) return "HIGH";
  if (attendancePercentage < 85 || performanceScore < 70) return "MEDIUM";
  return "LOW";
}

//  check if Flask is alive 
async function isMLServiceAlive() {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/health`, {
      timeout: 5000,
    });
    return response.data.modelLoaded === true;
  } catch {
    return false;
  }
}

//  predict risk for one student 
const predictRisk = async ({
  attendancePercentage,
  quizAverage,
  assignmentAverage,
  internalMarks,
  performanceScore,
}) => {
  const flaskAlive = await isMLServiceAlive();

  if (flaskAlive) {
    try {
      const { data } = await axios.post(
        `${ML_SERVICE_URL}/predict-risk`,
        {
          attendancePercentage,
          quizAverage:       quizAverage      ?? 0,
          assignmentAverage: assignmentAverage ?? 0,
          internalMarks:     internalMarks     ?? 0,
        },
        { timeout: 10000 }
      );

      return {
        riskLevel:       data.riskLevel,
        riskScore:       data.riskScore,
        passProbability: data.passProbability,
        predictedBy:     "ML",
      };
    }catch (err) {
  console.error("========== FLASK ERROR ==========");
  console.error("Message:", err.message);

  if (err.response) {
    console.error("Status:", err.response.status);
    console.error("Response:", err.response.data);
  } else {
    console.error(err);
  }

  console.error("================================");
}
  }

  //  fallback 
  const riskLevel = _fallbackRisk(attendancePercentage, performanceScore);

  return {
    riskLevel,
    riskScore:       riskLevel === "HIGH"   ? 1   : riskLevel === "MEDIUM" ? 0.5 : 0,
    passProbability: riskLevel === "LOW"    ? 1   : riskLevel === "MEDIUM" ? 0.5 : 0,
    predictedBy:     "FALLBACK",
  };
};

module.exports = { predictRisk, isMLServiceAlive };