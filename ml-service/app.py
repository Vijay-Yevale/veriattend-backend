

from flask import Flask, request, jsonify
import joblib
import pandas as pd


app = Flask(__name__)



try:
    model = joblib.load("model.pkl")
    
    classes = model.classes_.tolist()
    print(f"Model loaded successfully.")
    print(f"Classes: {classes}")
except Exception as e:
    print(f"ERROR: Could not load model.pkl → {e}")
    print("Run train.py first to generate model.pkl")
    model = None
    classes = []



@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "modelLoaded": model is not None
    })



@app.route("/predict-risk", methods=["POST"])
def predict_risk():

    #  check model is loaded
    if model is None:
        return jsonify({
            "error": "Model not loaded. Run train.py first."
        }), 500

    #  parse request body 
    body = request.get_json()

    if not body:
        return jsonify({ "error": "Request body is required" }), 400

    #  validate required fields 
    required = ["attendancePercentage", "quizAverage", "assignmentAverage", "internalMarks"]
    missing  = [field for field in required if field not in body]

    if missing:
        return jsonify({
            "error": f"Missing fields: {', '.join(missing)}"
        }), 400

    #  extract values
    attendance   = float(body["attendancePercentage"])
    quiz         = float(body["quizAverage"])
    assignment   = float(body["assignmentAverage"])
    internal_raw = float(body["internalMarks"])

 
    internal_normalized = (internal_raw / 30) * 100

    input_df = pd.DataFrame([{
        "attendancePercentage": attendance,
        "quizAverage":          quiz,
        "assignmentAverage":    assignment,
        "internalMarks":        internal_normalized,
    }])

    #  predict 
    # predict()      → returns ["LOW"] or ["MEDIUM"] or ["HIGH"]
    # predict_proba() → returns probability for each class
    #                   e.g. [0.05, 0.85, 0.10] for [HIGH, LOW, MEDIUM]

    risk_level   = model.predict(input_df)[0]
    probabilities = model.predict_proba(input_df)[0]

    #  calculate passProbability 
    # passProbability = P(LOW) + P(MEDIUM)
    # meaning: how likely is student to pass
    # riskScore = P(HIGH) → how likely is student to be at risk

    high_idx = classes.index("HIGH")
    low_idx  = classes.index("LOW")
    med_idx  = classes.index("MEDIUM")

    risk_score       = round(float(probabilities[high_idx]), 4)
    pass_probability = round(float(probabilities[low_idx] + probabilities[med_idx]), 4)

    #  return result ─
    return jsonify({
        "riskLevel":       risk_level,
        "riskScore":       risk_score,       # P(HIGH)  → 0.0 to 1.0
        "passProbability": pass_probability, # P(PASS)  → 0.0 to 1.0
    })



if __name__ == "__main__":
    print("Starting VeriAttend ML Service on port 5001...")
    app.run(
        host="0.0.0.0",  # accessible from Node.js
        port=5001,
        debug=True       # set to False in production
    )