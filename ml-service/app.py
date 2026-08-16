import os

import joblib
import pandas as pd
from flask import Flask, jsonify, request


app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "model",
    "model.pkl",
)

model = None
classes = []


try:
    model = joblib.load(MODEL_PATH)
    classes = model.classes_.tolist()

    print("Model loaded successfully")
    print("Model path:", MODEL_PATH)
    print("Classes:", classes)

except Exception as error:
    print("Could not load model:", error)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "modelLoaded": model is not None,
    })


@app.route("/predict-risk", methods=["POST"])
def predict_risk():
    if model is None:
        return jsonify({
            "error": "Model not loaded."
        }), 500

    body = request.get_json(silent=True)

    if not body:
        return jsonify({
            "error": "Request body is required."
        }), 400

    required_fields = [
        "attendancePercentage",
        "quizAverage",
        "assignmentAverage",
        "internalMarks",
    ]

    missing_fields = [
        field
        for field in required_fields
        if field not in body
    ]

    if missing_fields:
        return jsonify({
            "error": (
                "Missing fields: "
                + ", ".join(missing_fields)
            )
        }), 400

    try:
        attendance = float(
            body["attendancePercentage"]
        )
        quiz = float(
            body["quizAverage"]
        )
        assignment = float(
            body["assignmentAverage"]
        )
        internal = float(
            body["internalMarks"]
        )

    except (ValueError, TypeError):
        return jsonify({
            "error": "All values must be numeric."
        }), 400

    if not 0 <= attendance <= 100:
        return jsonify({
            "error":
                "attendancePercentage must be between 0 and 100"
        }), 400

    if not 0 <= quiz <= 100:
        return jsonify({
            "error":
                "quizAverage must be between 0 and 100"
        }), 400

    if not 0 <= assignment <= 100:
        return jsonify({
            "error":
                "assignmentAverage must be between 0 and 100"
        }), 400

    if not 0 <= internal <= 30:
        return jsonify({
            "error":
                "internalMarks must be between 0 and 30"
        }), 400

    internal_percentage = (internal / 30) * 100

    input_df = pd.DataFrame([
        {
            "attendancePercentage": attendance,
            "quizAverage": quiz,
            "assignmentAverage": assignment,
            "internalMarks": internal_percentage,
        }
    ])

    try:
        prediction = model.predict(input_df)[0]
        probabilities = model.predict_proba(input_df)[0]

    except Exception as error:
        return jsonify({
            "error": str(error)
        }), 500

    required_classes = [
        "HIGH",
        "LOW",
        "MEDIUM",
    ]

    missing_classes = [
        risk_class
        for risk_class in required_classes
        if risk_class not in classes
    ]

    if missing_classes:
        return jsonify({
            "error": (
                "Model is missing classes: "
                + ", ".join(missing_classes)
            )
        }), 500

    high_index = classes.index("HIGH")
    low_index = classes.index("LOW")
    medium_index = classes.index("MEDIUM")

    risk_score = round(
        float(probabilities[high_index]),
        4,
    )

    pass_probability = round(
        float(
            probabilities[low_index]
            + probabilities[medium_index]
        ),
        4,
    )

    return jsonify({
        "riskLevel": str(prediction),
        "riskScore": risk_score,
        "passProbability": pass_probability,
    })


if __name__ == "__main__":
    port = int(
        os.environ.get("PORT", 5001)
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False,
    )