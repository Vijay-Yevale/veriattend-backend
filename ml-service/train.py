import os

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)
from sklearn.model_selection import train_test_split


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATASET_PATH = os.path.join(
    BASE_DIR,
    "datasets",
    "student_risk_dataset.csv",
)

MODEL_DIR = os.path.join(BASE_DIR, "model")
MODEL_PATH = os.path.join(MODEL_DIR, "model.pkl")


df = pd.read_csv(DATASET_PATH)

print("Dataset loaded successfully")
print("Dataset shape:", df.shape)

print("\nRisk level distribution")
print(df["riskLevel"].value_counts())

required_columns = [
    "attendancePercentage",
    "quizAverage",
    "assignmentAverage",
    "internalMarks",
    "riskLevel",
]

missing_columns = [
    column
    for column in required_columns
    if column not in df.columns
]

if missing_columns:
    raise ValueError(
        f"Missing required columns: {missing_columns}"
    )


df["internalMarks"] = (df["internalMarks"] / 30) * 100

features = [
    "attendancePercentage",
    "quizAverage",
    "assignmentAverage",
    "internalMarks",
]

X = df[features]
y = df["riskLevel"]


X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y,
)


model = RandomForestClassifier(
    n_estimators=200,
    max_depth=10,
    min_samples_split=2,
    random_state=42,
)

print("\nTraining Random Forest...")

model.fit(X_train, y_train)

print("Training completed")


y_pred = model.predict(X_test)

accuracy = accuracy_score(y_test, y_pred)

print(f"\nAccuracy: {accuracy * 100:.2f}%")

print("\nClassification Report")
print(classification_report(y_test, y_pred))

print("\nConfusion Matrix")
print(confusion_matrix(y_test, y_pred))

print("\nFeature Importance")

for feature, importance in zip(
    features,
    model.feature_importances_,
):
    print(f"{feature}: {importance:.4f}")


os.makedirs(MODEL_DIR, exist_ok=True)

joblib.dump(model, MODEL_PATH)

print("\nModel saved successfully")
print(f"Location: {MODEL_PATH}")


test_cases = [
    {
        "attendancePercentage": 92,
        "quizAverage": 88,
        "assignmentAverage": 90,
        "internalMarks": 26,
    },
    {
        "attendancePercentage": 78,
        "quizAverage": 69,
        "assignmentAverage": 70,
        "internalMarks": 20,
    },
    {
        "attendancePercentage": 56,
        "quizAverage": 42,
        "assignmentAverage": 40,
        "internalMarks": 10,
    },
    {
        "attendancePercentage": 84,
        "quizAverage": 76,
        "assignmentAverage": 77,
        "internalMarks": 22,
    },
]

print("\nSanity Test")

for student in test_cases:
    internal_percentage = (
        student["internalMarks"] / 30
    ) * 100

    sample = pd.DataFrame(
        [
            {
                "attendancePercentage":
                    student["attendancePercentage"],
                "quizAverage":
                    student["quizAverage"],
                "assignmentAverage":
                    student["assignmentAverage"],
                "internalMarks":
                    internal_percentage,
            }
        ]
    )

    prediction = model.predict(sample)[0]

    print("-" * 40)
    print(student)
    print("Predicted Risk:", prediction)