from flask import Flask, request, jsonify
import joblib
import pandas as pd
import os

app = Flask(__name__)


# Load Trained Model


try:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

    # Model path
    MODEL_PATH = os.path.join(BASE_DIR, "model", "model.pkl")

    # Load model
    model = joblib.load(MODEL_PATH)

    # Get class labels
    classes = model.classes_.tolist()

    print("=" * 50)
    print("Model loaded successfully.")
    print(f"Model Path : {MODEL_PATH}")
    print(f"Classes    : {classes}")
    print("=" * 50)

except Exception as e:
    print("=" * 50)
    print(f"ERROR: Could not load model -> {e}")
    print("Run train.py first to generate model/model.pkl")
    print("=" * 50)

    model = None
    classes = []



# Health Check


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "modelLoaded": model is not None
    })



# Predict Risk


@app.route("/predict-risk", methods=["POST"])
def predict_risk():

    # Check model
    if model is None:
        return jsonify({
            "error": "Model not loaded."
        }), 500

    body = request.get_json()

    if not body:
        return jsonify({
            "error": "Request body is required."
        }), 400

    # Required fields
    required = [
        "attendancePercentage",
        "quizAverage",
        "assignmentAverage",
        "internalMarks"
    ]

    missing = [field for field in required if field not in body]

    if missing:
        return jsonify({
            "error": f"Missing fields: {', '.join(missing)}"
        }), 400

    try:

        attendance = float(body["attendancePercentage"])
        quiz = float(body["quizAverage"])
        assignment = float(body["assignmentAverage"])
        internal = float(body["internalMarks"])

    except ValueError:
        return jsonify({
            "error": "All values must be numeric."
        }), 400

    # Validation


    if not (0 <= attendance <= 100):
        return jsonify({"error": "attendancePercentage must be between 0 and 100"}), 400

    if not (0 <= quiz <= 100):
        return jsonify({"error": "quizAverage must be between 0 and 100"}), 400

    if not (0 <= assignment <= 100):
        return jsonify({"error": "assignmentAverage must be between 0 and 100"}), 400

    if not (0 <= internal <= 30):
        return jsonify({"error": "internalMarks must be between 0 and 30"}), 400


    internal_percentage = (internal / 30) * 100

  
    # Prepare Input
   

    input_df = pd.DataFrame([{
        "attendancePercentage": attendance,
        "quizAverage": quiz,
        "assignmentAverage": assignment,
        "internalMarks": internal_percentage
    }])


    # Prediction
   

    try:

        prediction = model.predict(input_df)[0]

        probabilities = model.predict_proba(input_df)[0]

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

    
    # Probability Calculation
    

    high_index = classes.index("HIGH")
    low_index = classes.index("LOW")
    medium_index = classes.index("MEDIUM")

    risk_score = round(float(probabilities[high_index]), 4)

    pass_probability = round(
        float(
            probabilities[low_index] +
            probabilities[medium_index]
        ),
        4
    )


    # Response
    

    return jsonify({

        "riskLevel": prediction,

        "riskScore": risk_score,

        "passProbability": pass_probability

    })



# Start Flask Server


if __name__ == "__main__":

    print("\nStarting VeriAttend ML Service...")

    app.run(
        host="0.0.0.0",
        port=5001,
        debug=True
    )