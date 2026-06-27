import pandas as pd
import joblib

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report,confusion_matrix



# Read dataset from CSV
df = pd.read_csv("datasets/student_risk_dataset.csv")

print("=" * 50)
print("Dataset Loaded Successfully")
print("=" * 50)

print("Dataset Shape :", df.shape)

print("\nRisk Level Distribution")
print(df["riskLevel"].value_counts())

print("\nFirst 5 Rows")
print(df.head())



# Data Preprocessing


# Internal marks are out of 30.
# Convert them into percentage.

df["internalMarks"] = (df["internalMarks"] / 30) * 100



# STEP 3 : Split Features and Labels


X = df[
    [
        "attendancePercentage",
        "quizAverage",
        "assignmentAverage",
        "internalMarks",
    ]
]

y = df["riskLevel"]



# STEP 4 : Train Test Split


X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print("\nTraining Samples :", len(X_train))
print("Testing Samples  :", len(X_test))


# STEP 5 : Create Random Forest Model


model = RandomForestClassifier(

  
    n_estimators=200,

   
    max_depth=10,

  
    min_samples_split=2,

    random_state=42
)



#  Train Model

print("\nTraining Random Forest...")

model.fit(X_train, y_train)

print("Training Completed Successfully")


#  Evaluate Model


y_pred = model.predict(X_test)

print("\nAccuracy")

accuracy = accuracy_score(y_test, y_pred)

print(f"{accuracy*100:.2f}%")

print("\nClassification Report")

print(classification_report(y_test, y_pred))

cm = confusion_matrix(y_test, y_pred)

print(cm)



#  Feature Importance


print("\nFeature Importance")

feature_names = X.columns

for feature, importance in zip(feature_names, model.feature_importances_):

    print(f"{feature:25} : {importance:.4f}")



#  Save Model


joblib.dump(model, "model/model.pkl")

print("\nModel Saved Successfully")

print("Location : model/model.pkl")


# Sanity Test


print("\nTesting Model")

test_cases = [

    {
        "attendancePercentage":92,
        "quizAverage":88,
        "assignmentAverage":90,
        "internalMarks":26
    },

    {
        "attendancePercentage":78,
        "quizAverage":69,
        "assignmentAverage":70,
        "internalMarks":20
    },

    {
        "attendancePercentage":56,
        "quizAverage":42,
        "assignmentAverage":40,
        "internalMarks":10
    },

    # Boundary Case
    {
        "attendancePercentage":84,
        "quizAverage":76,
        "assignmentAverage":77,
        "internalMarks":22
    }

]


for student in test_cases:

    internal_percentage = (student["internalMarks"] / 30) * 100

    sample = pd.DataFrame(
        [[

            student["attendancePercentage"],
            student["quizAverage"],
            student["assignmentAverage"],
            internal_percentage

        ]],

        columns=[
            "attendancePercentage",
            "quizAverage",
            "assignmentAverage",
            "internalMarks"
        ]
    )

    prediction = model.predict(sample)[0]

    print("-"*60)

    print(student)

    print("Predicted Risk :", prediction)