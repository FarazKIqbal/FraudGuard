"""
FraudGuard - Model Training Script
Trains multiple ML models for fraud detection:
- Random Forest
- XGBoost
- Neural Network (MLP)
"""

import pandas as pd
import numpy as np
import joblib
import os
from datetime import datetime
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import (
    classification_report, confusion_matrix, 
    accuracy_score, precision_score, recall_score, 
    f1_score, roc_auc_score, roc_curve
)
import warnings
warnings.filterwarnings('ignore')

# Try to import XGBoost
try:
    from xgboost import XGBClassifier
    XGBOOST_AVAILABLE = True
except ImportError:
    print("Warning: XGBoost not installed. Will skip XGBoost model.")
    print("Install with: pip install xgboost")
    XGBOOST_AVAILABLE = False

# Configuration
MODELS_DIR = 'models'
PROCESSED_DATA_DIR = 'dataset/processed'
TRAIN_DATA_PATH = os.path.join(PROCESSED_DATA_DIR, 'train_data.csv')
TEST_DATA_PATH = os.path.join(PROCESSED_DATA_DIR, 'test_data.csv')

print("=" * 70)
print("FraudGuard - Model Training Pipeline")
print("=" * 70)

# Load processed data
print("\n[1/5] Loading preprocessed data...")
train_data = pd.read_csv(TRAIN_DATA_PATH)
test_data = pd.read_csv(TEST_DATA_PATH)

# Load feature metadata
metadata = joblib.load(os.path.join(MODELS_DIR, 'feature_metadata.joblib'))
feature_columns = metadata['feature_order']
target_column = metadata['target']

# Separate features and target
X_train = train_data[feature_columns]
y_train = train_data[target_column]
X_test = test_data[feature_columns]
y_test = test_data[target_column]

print(f"Training set: {X_train.shape[0]} samples, {X_train.shape[1]} features")
print(f"Test set: {X_test.shape[0]} samples, {X_test.shape[1]} features")
print(f"Fraud rate - Train: {y_train.mean()*100:.2f}%, Test: {y_test.mean()*100:.2f}%")

# Dictionary to store trained models and their metrics
models = {}
metrics_summary = []


def evaluate_model(model, model_name, X_test, y_test):
    """Evaluate model and return metrics"""
    print(f"\n  Evaluating {model_name}...")
    
    # Predictions
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]
    
    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_proba)
    
    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()
    
    print(f"    Accuracy:  {accuracy:.4f}")
    print(f"    Precision: {precision:.4f}")
    print(f"    Recall:    {recall:.4f}")
    print(f"    F1-Score:  {f1:.4f}")
    print(f"    ROC-AUC:   {roc_auc:.4f}")
    
    metrics = {
        'model': model_name,
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1_score': f1,
        'roc_auc': roc_auc,
        'true_negatives': int(tn),
        'false_positives': int(fp),
        'false_negatives': int(fn),
        'true_positives': int(tp)
    }
    
    return metrics


# ============================================================================
# MODEL 1: RANDOM FOREST
# ============================================================================
print("\n[2/5] Training Random Forest Classifier...")
rf_model = RandomForestClassifier(
    n_estimators=200,
    max_depth=20,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1,
    verbose=0,
    # Class weighting: the dataset is 75% legitimate / 25% fraud, so an
    # unbalanced model optimises for accuracy and misses most fraud.  Using
    # balanced weights makes the model pay the same cost for a false
    # negative as for a false positive — exactly what fraud detection needs.
    class_weight='balanced',
)

rf_model.fit(X_train, y_train)
print("  ✓ Random Forest training complete")

# Evaluate
rf_metrics = evaluate_model(rf_model, "Random Forest", X_test, y_test)
metrics_summary.append(rf_metrics)

# Save model
rf_path = os.path.join(MODELS_DIR, 'random_forest_model.joblib')
joblib.dump(rf_model, rf_path)
print(f"  ✓ Saved to {rf_path}")
models['random_forest'] = rf_model


# ============================================================================
# MODEL 2: XGBOOST
# ============================================================================
if XGBOOST_AVAILABLE:
    print("\n[3/5] Training XGBoost Classifier...")
    # scale_pos_weight = (# negative) / (# positive) so the model treats
    # a false negative as more costly than a false positive.
    scale_pos_weight = int((1 - y_train.mean()) / y_train.mean())
    print(f"  scale_pos_weight = {scale_pos_weight}")
    xgb_model = XGBClassifier(
        n_estimators=200,
        max_depth=10,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1,
        eval_metric='logloss',
        scale_pos_weight=scale_pos_weight,
    )
    
    xgb_model.fit(X_train, y_train)
    print("  ✓ XGBoost training complete")
    
    # Evaluate
    xgb_metrics = evaluate_model(xgb_model, "XGBoost", X_test, y_test)
    metrics_summary.append(xgb_metrics)
    
    # Save model
    xgb_path = os.path.join(MODELS_DIR, 'xgboost_model.joblib')
    joblib.dump(xgb_model, xgb_path)
    print(f"  ✓ Saved to {xgb_path}")
    models['xgboost'] = xgb_model
else:
    print("\n[3/5] Skipping XGBoost (not installed)")


# ============================================================================
# MODEL 3: NEURAL NETWORK (MLP)
# ============================================================================
print("\n[4/5] Training Neural Network (MLP)...")
nn_model = MLPClassifier(
    hidden_layer_sizes=(128, 64, 32),
    activation='relu',
    solver='adam',
    alpha=0.0001,
    batch_size=256,
    learning_rate='adaptive',
    learning_rate_init=0.001,
    max_iter=200,
    random_state=42,
    early_stopping=True,
    validation_fraction=0.1,
    n_iter_no_change=10,
    verbose=False
)

nn_model.fit(X_train, y_train)
print("  ✓ Neural Network training complete")

# Evaluate
nn_metrics = evaluate_model(nn_model, "Neural Network", X_test, y_test)
metrics_summary.append(nn_metrics)

# Save model
nn_path = os.path.join(MODELS_DIR, 'neural_network_model.joblib')
joblib.dump(nn_model, nn_path)
print(f"  ✓ Saved to {nn_path}")
models['neural_network'] = nn_model


# ============================================================================
# COMPARISON AND SUMMARY
# ============================================================================
print("\n[5/5] Model Comparison Summary")
print("=" * 70)

metrics_df = pd.DataFrame(metrics_summary)
print("\n" + metrics_df.to_string(index=False))

# Find best model for each metric
print("\n" + "=" * 70)
print("Best Models by Metric:")
print("=" * 70)
for metric in ['accuracy', 'precision', 'recall', 'f1_score', 'roc_auc']:
    best_idx = metrics_df[metric].idxmax()
    best_model = metrics_df.loc[best_idx, 'model']
    best_value = metrics_df.loc[best_idx, metric]
    print(f"  {metric.upper():15s}: {best_model:20s} ({best_value:.4f})")

# Save metrics summary
metrics_path = os.path.join(MODELS_DIR, 'model_metrics.csv')
metrics_df.to_csv(metrics_path, index=False)
print(f"\n✓ Metrics saved to {metrics_path}")

# ---------------------------------------------------------------------------
# Threshold sweep: show how precision/recall/F1 change as we move the
# decision threshold.  The default 0.5 threshold is not optimal for an
# imbalanced fraud dataset — lowering it trades a few false positives for
# many more true positives, which is almost always the right trade-off.
# ---------------------------------------------------------------------------
print("\n" + "=" * 70)
print("Decision-Threshold Sweep (on test set)")
print("=" * 70)
print(f"{'Model':<18} {'Thr':>5} {'Prec':>7} {'Rec':>7} {'F1':>7} {'Flagged':>8}")
print("-" * 58)
best_by_f1 = {}
for name, model in models.items():
    y_proba = model.predict_proba(X_test)[:, 1]
    for thr in (0.3, 0.35, 0.4, 0.45, 0.5):
        y_pred = (y_proba >= thr).astype(int)
        p = precision_score(y_test, y_pred)
        r = recall_score(y_test, y_pred)
        f = f1_score(y_test, y_pred)
        flagged = int(y_pred.sum())
        print(f"{name:<18} {thr:>5.2f} {p:>7.4f} {r:>7.4f} {f:>7.4f} {flagged:>8}")
        # Track the best F1 per model for the metadata file.
        if name not in best_by_f1 or f > best_by_f1[name]['f1']:
            best_by_f1[name] = {'threshold': thr, 'precision': p, 'recall': r, 'f1': f}

# Persist the best thresholds so inference can use them.
thresholds_path = os.path.join(MODELS_DIR, 'best_thresholds.joblib')
joblib.dump(best_by_f1, thresholds_path)
print(f"\n✓ Best thresholds saved to {thresholds_path}")
for name, info in best_by_f1.items():
    print(f"  {name:<18} best threshold = {info['threshold']:.2f} "
          f"(F1={info['f1']:.4f}, recall={info['recall']:.4f})")

# Save model metadata
model_metadata = {
    'training_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
    'models_trained': list(models.keys()),
    'training_samples': len(X_train),
    'test_samples': len(X_test),
    'num_features': X_train.shape[1],
    'feature_names': feature_columns,
    'best_model_by_f1': metrics_df.loc[metrics_df['f1_score'].idxmax(), 'model'],
    'best_model_by_roc_auc': metrics_df.loc[metrics_df['roc_auc'].idxmax(), 'model']
}

model_metadata_path = os.path.join(MODELS_DIR, 'model_metadata.joblib')
joblib.dump(model_metadata, model_metadata_path)
print(f"✓ Model metadata saved to {model_metadata_path}")

print("\n" + "=" * 70)
print("TRAINING COMPLETE!")
print("=" * 70)
print(f"\nTrained Models: {', '.join(models.keys())}")
print(f"Models saved in: {MODELS_DIR}/")
print("\nNext steps:")
print("  1. Use inference.py to make predictions on new data")
print("  2. Review model_metrics.csv for detailed comparison")
print("  3. Deploy the best performing model to production")
print("=" * 70)
