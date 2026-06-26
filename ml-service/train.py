

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib



data = {
    "attendancePercentage": [
        # LOW risk students (20 samples)
        92, 90, 88, 95, 91, 87, 93, 89, 94, 86,
        90, 92, 88, 91, 87, 93, 89, 94, 86, 90,
        # MEDIUM risk students (20 samples)
        80, 78, 82, 76, 79, 83, 77, 81, 75, 84,
        78, 80, 76, 82, 79, 77, 83, 75, 81, 84,
        # HIGH risk students (20 samples)
        60, 58, 62, 55, 65, 57, 63, 59, 64, 56,
        61, 58, 63, 55, 67, 57, 60, 59, 64, 56,
    ],
    "quizAverage": [
        # LOW
        85, 82, 88, 90, 84, 86, 89, 83, 87, 91,
        85, 82, 88, 90, 84, 86, 89, 83, 87, 91,
        # MEDIUM
        68, 72, 65, 70, 74, 67, 71, 69, 73, 66,
        68, 72, 65, 70, 74, 67, 71, 69, 73, 66,
        # HIGH
        40, 38, 42, 35, 45, 37, 43, 39, 44, 36,
        40, 38, 42, 35, 45, 37, 43, 39, 44, 36,
    ],
    "assignmentAverage": [
        # LOW
        88, 85, 90, 92, 86, 89, 91, 84, 87, 93,
        88, 85, 90, 92, 86, 89, 91, 84, 87, 93,
        # MEDIUM
        70, 68, 72, 65, 74, 67, 71, 69, 73, 66,
        70, 68, 72, 65, 74, 67, 71, 69, 73, 66,
        # HIGH
        45, 42, 48, 38, 50, 40, 46, 43, 49, 39,
        45, 42, 48, 38, 50, 40, 46, 43, 49, 39,
    ],
    "internalMarks": [
        # LOW  (out of 30)
        26, 25, 27, 28, 24, 26, 27, 25, 28, 29,
        26, 25, 27, 28, 24, 26, 27, 25, 28, 29,
        # MEDIUM (out of 30)
        20, 18, 21, 17, 22, 19, 20, 18, 21, 17,
        20, 18, 21, 17, 22, 19, 20, 18, 21, 17,
        # HIGH (out of 30)
        10, 9,  11, 8,  13, 9,  12, 10, 11, 8,
        10, 9,  11, 8,  13, 9,  12, 10, 11, 8,
    ],
    "riskLevel": (
        ["LOW"]    * 20 +
        ["MEDIUM"] * 20 +
        ["HIGH"]   * 20
    ),
}

df = pd.DataFrame(data)



df["internalMarks"] = (df["internalMarks"] / 30) * 100

print("Dataset shape:", df.shape)
print("\nRisk level distribution:")
print(df["riskLevel"].value_counts())
print("\nSample data:")
print(df.head(3))



X = df[["attendancePercentage", "quizAverage", "assignmentAverage", "internalMarks"]]
y = df["riskLevel"]



X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
   
)

print(f"\nTraining samples : {len(X_train)}")
print(f"Testing samples  : {len(X_test)}")



model = RandomForestClassifier(
    n_estimators=100,
    random_state=42,
    max_depth=10,    
    min_samples_split=2,
)

print("\nTraining model...")
model.fit(X_train, y_train)
print("Training complete.")


y_pred = model.predict(X_test)

print("\n Model Accuracy")
print(f"Accuracy: {accuracy_score(y_test, y_pred) * 100:.2f}%")
print("\n Classification Report ")
print(classification_report(y_test, y_pred))


feature_names = ["attendancePercentage", "quizAverage", "assignmentAverage", "internalMarks"]
importances = model.feature_importances_

print(" Feature Importance")
for name, importance in zip(feature_names, importances):
    print(f"  {name:25s}: {importance:.4f}")


joblib.dump(model, "model.pkl")
print("\nmodel.pkl saved successfully.")


print("\n Sanity Check")
test_cases = [
    {"attendancePercentage": 92, "quizAverage": 85, "assignmentAverage": 88, "internalMarks": 26},  # expect LOW
    {"attendancePercentage": 78, "quizAverage": 68, "assignmentAverage": 70, "internalMarks": 19},  # expect MEDIUM
    {"attendancePercentage": 58, "quizAverage": 38, "assignmentAverage": 42, "internalMarks": 9},   # expect HIGH
]

for case in test_cases:
    
    normalized = case.copy()
    normalized["internalMarks"] = (case["internalMarks"] / 30) * 100

    prediction = model.predict([[
        normalized["attendancePercentage"],
        normalized["quizAverage"],
        normalized["assignmentAverage"],
        normalized["internalMarks"],
    ]])
    print(f"  Attendance={case['attendancePercentage']}% Quiz={case['quizAverage']} → {prediction[0]}")