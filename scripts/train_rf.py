"""
Train a lighter Random Forest for the Docker build so the committed binary
never exceeds GitHub's 100 MB limit.
"""
import pandas as pd
import numpy as np
import joblib
import os
from sklearn.ensemble import RandomForestClassifier

# Paths
MODELS_DIR = 'models'
PROCESSED_DIR = 'dataset/processed'
META_PATH = os.path.join(MODELS_DIR, 'feature_metadata.joblib')
TRAIN_PATH = os.path.join(PROCESSED_DIR, 'train_data.csv')
TEST_PATH = os.path.join(PROCESSED_DIR, 'test_data.csv')

# Load metadata and data
meta = joblib.load(META_PATH)
train = pd.read_csv(TRAIN_PATH)
test = pd.read_csv(TEST_PATH)

feature_columns = meta['feature_order']
target_column = meta['target']

X_train = train[feature_columns]
y_train = train[target_column]

# Train a lighter Random Forest (100 trees, max depth 12)
print(f"Training lightweight RF: samples={len(X_train)}, features={X_train.shape[1]}")
rf = RandomForestClassifier(
    n_estimators=100,
    max_depth=12,
    min_samples_split=10,
    min_samples_leaf=4,
    random_state=42,
    n_jobs=-1,
    class_weight='balanced',
)
rf.fit(X_train, y_train)

# Save model
joblib.dump(rf, os.path.join(MODELS_DIR, 'random_forest_model.joblib'))
size_mb = round(os.path.getsize(os.path.join(MODELS_DIR, 'random_forest_model.joblib')) / 1024 / 1024, 1)
print(f"RF retrained, size: {size_mb} MB")