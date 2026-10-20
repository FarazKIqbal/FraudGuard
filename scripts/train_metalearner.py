"""
FraudGuard - Meta-Learner (Stacking Ensemble)
Trains a meta-learner that combines predictions from:
- Random Forest
- XGBoost  
- Neural Network

Uses stacking with cross-validation to avoid overfitting.
"""

import pandas as pd
import numpy as np
import joblib
import os
from datetime import datetime
from sklearn.model_selection import cross_val_predict
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import (
    classification_report, confusion_matrix,
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score
)
import warnings
warnings.filterwarnings('ignore')

# Configuration
MODELS_DIR = 'models'
PROCESSED_DATA_DIR = 'dataset/processed'
TRAIN_DATA_PATH = os.path.join(PROCESSED_DATA_DIR, 'train_data.csv')
TEST_DATA_PATH = os.path.join(PROCESSED_DATA_DIR, 'test_data.csv')

print("=" * 70)
print("FraudGuard - Meta-Learner Training Pipeline")
print("=" * 70)

# Load preprocessed data
print("\n[1/6] Loading preprocessed data...")
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
print(f"Test set: {X_test.shape[0]} samples")

# Load base models
print("\n[2/6] Loading base models...")
base_models = {}

# Load Random Forest
rf_path = os.path.join(MODELS_DIR, 'random_forest_model.joblib')
if os.path.exists(rf_path):
    base_models['random_forest'] = joblib.load(rf_path)
    print("  ✓ Random Forest loaded")

# Load XGBoost
xgb_path = os.path.join(MODELS_DIR, 'xgboost_model.joblib')
if os.path.exists(xgb_path):
    base_models['xgboost'] = joblib.load(xgb_path)
    print("  ✓ XGBoost loaded")

# Load Neural Network
nn_path = os.path.join(MODELS_DIR, 'neural_network_model.joblib')
if os.path.exists(nn_path):
    base_models['neural_network'] = joblib.load(nn_path)
    print("  ✓ Neural Network loaded")

if len(base_models) < 2:
    raise RuntimeError("Need at least 2 base models for meta-learning. Train models first!")

print(f"\nUsing {len(base_models)} base models: {', '.join(base_models.keys())}")

# Generate meta-features using cross-validation
print("\n[3/6] Generating meta-features using 5-fold CV...")
print("  (This ensures the meta-learner doesn't overfit to base model predictions)")

meta_train_features = np.zeros((len(X_train), len(base_models) * 2))  # predictions + probabilities
meta_test_features = np.zeros((len(X_test), len(base_models) * 2))

for i, (model_name, model) in enumerate(base_models.items()):
    print(f"\n  Processing {model_name}...")
    
    # Get out-of-fold predictions for training data (to avoid overfitting)
    train_preds = cross_val_predict(model, X_train, y_train, cv=5, method='predict')
    train_proba = cross_val_predict(model, X_train, y_train, cv=5, method='predict_proba')
    
    # Get predictions for test data (using the already trained model)
    test_preds = model.predict(X_test)
    test_proba = model.predict_proba(X_test)
    
    # Store predictions and probabilities as meta-features
    meta_train_features[:, i*2] = train_preds
    meta_train_features[:, i*2 + 1] = train_proba[:, 1]  # probability of fraud
    
    meta_test_features[:, i*2] = test_preds
    meta_test_features[:, i*2 + 1] = test_proba[:, 1]
    
    print(f"    Train accuracy: {accuracy_score(y_train, train_preds):.4f}")
    print(f"    Test accuracy:  {accuracy_score(y_test, test_preds):.4f}")

# Create feature names for meta-features
meta_feature_names = []
for model_name in base_models.keys():
    meta_feature_names.append(f'{model_name}_prediction')
    meta_feature_names.append(f'{model_name}_fraud_probability')

print(f"\n  ✓ Generated {meta_train_features.shape[1]} meta-features")

# Train meta-learner
print("\n[4/6] Training meta-learner...")
print("  Testing multiple meta-learner algorithms...")

meta_learners = {}

# Option 1: Logistic Regression (simple, interpretable)
print("\n  [A] Logistic Regression...")
lr_meta = LogisticRegression(random_state=42, max_iter=1000)
lr_meta.fit(meta_train_features, y_train)
lr_preds = lr_meta.predict(meta_test_features)
lr_proba = lr_meta.predict_proba(meta_test_features)[:, 1]
lr_acc = accuracy_score(y_test, lr_preds)
lr_f1 = f1_score(y_test, lr_preds)
lr_auc = roc_auc_score(y_test, lr_proba)
print(f"      Accuracy: {lr_acc:.4f}, F1: {lr_f1:.4f}, ROC-AUC: {lr_auc:.4f}")
meta_learners['logistic_regression'] = {
    'model': lr_meta,
    'accuracy': lr_acc,
    'f1_score': lr_f1,
    'roc_auc': lr_auc
}

# Option 2: Gradient Boosting (more powerful)
print("\n  [B] Gradient Boosting...")
gb_meta = GradientBoostingClassifier(
    n_estimators=100,
    max_depth=3,
    learning_rate=0.1,
    random_state=42
)
gb_meta.fit(meta_train_features, y_train)
gb_preds = gb_meta.predict(meta_test_features)
gb_proba = gb_meta.predict_proba(meta_test_features)[:, 1]
gb_acc = accuracy_score(y_test, gb_preds)
gb_f1 = f1_score(y_test, gb_preds)
gb_auc = roc_auc_score(y_test, gb_proba)
print(f"      Accuracy: {gb_acc:.4f}, F1: {gb_f1:.4f}, ROC-AUC: {gb_auc:.4f}")
meta_learners['gradient_boosting'] = {
    'model': gb_meta,
    'accuracy': gb_acc,
    'f1_score': gb_f1,
    'roc_auc': gb_auc
}

# Select best meta-learner based on F1 score
best_meta_name = max(meta_learners, key=lambda k: meta_learners[k]['f1_score'])
best_meta_model = meta_learners[best_meta_name]['model']

print(f"\n  ✓ Best meta-learner: {best_meta_name}")
print(f"    F1 Score: {meta_learners[best_meta_name]['f1_score']:.4f}")

# Detailed evaluation of best meta-learner
print("\n[5/6] Evaluating Meta-Learner...")
meta_preds = best_meta_model.predict(meta_test_features)
meta_proba = best_meta_model.predict_proba(meta_test_features)[:, 1]

# Calculate comprehensive metrics
accuracy = accuracy_score(y_test, meta_preds)
precision = precision_score(y_test, meta_preds)
recall = recall_score(y_test, meta_preds)
f1 = f1_score(y_test, meta_preds)
roc_auc = roc_auc_score(y_test, meta_proba)

# Confusion matrix
cm = confusion_matrix(y_test, meta_preds)
tn, fp, fn, tp = cm.ravel()

print(f"\n  Accuracy:  {accuracy:.4f}")
print(f"  Precision: {precision:.4f}")
print(f"  Recall:    {recall:.4f}")
print(f"  F1-Score:  {f1:.4f}")
print(f"  ROC-AUC:   {roc_auc:.4f}")

print(f"\n  Confusion Matrix:")
print(f"    True Negatives:  {tn}")
print(f"    False Positives: {fp}")
print(f"    False Negatives: {fn}")
print(f"    True Positives:  {tp}")

# Compare with base models
print("\n[6/6] Comparison with Base Models")
print("=" * 70)

# Load base model metrics
base_metrics_df = pd.read_csv(os.path.join(MODELS_DIR, 'model_metrics.csv'))

# Add meta-learner metrics
meta_metrics = {
    'model': f'Meta-Learner ({best_meta_name})',
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

comparison_df = pd.concat([base_metrics_df, pd.DataFrame([meta_metrics])], ignore_index=True)
print("\n" + comparison_df.to_string(index=False))

# Highlight improvements
print("\n" + "=" * 70)
print("Meta-Learner Performance vs Best Base Model:")
print("=" * 70)

best_base_f1 = base_metrics_df['f1_score'].max()
best_base_auc = base_metrics_df['roc_auc'].max()

f1_improvement = ((f1 - best_base_f1) / best_base_f1) * 100
auc_improvement = ((roc_auc - best_base_auc) / best_base_auc) * 100

print(f"F1 Score:  {f1:.4f} vs {best_base_f1:.4f} "
      f"({f1_improvement:+.2f}% improvement)")
print(f"ROC-AUC:   {roc_auc:.4f} vs {best_base_auc:.4f} "
      f"({auc_improvement:+.2f}% improvement)")

# Save meta-learner
print("\n" + "=" * 70)
print("Saving Meta-Learner Components")
print("=" * 70)

# Save the meta-learner model
meta_model_path = os.path.join(MODELS_DIR, 'meta_learner_model.joblib')
joblib.dump(best_meta_model, meta_model_path)
print(f"✓ Meta-learner saved to {meta_model_path}")

# Save meta-learner metadata
meta_metadata = {
    'meta_learner_type': best_meta_name,
    'base_models': list(base_models.keys()),
    'num_base_models': len(base_models),
    'meta_feature_names': meta_feature_names,
    'training_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
    'metrics': {
        'accuracy': float(accuracy),
        'precision': float(precision),
        'recall': float(recall),
        'f1_score': float(f1),
        'roc_auc': float(roc_auc)
    },
    'improvement_over_best_base': {
        'f1_improvement_pct': float(f1_improvement),
        'auc_improvement_pct': float(auc_improvement)
    }
}

meta_metadata_path = os.path.join(MODELS_DIR, 'meta_learner_metadata.joblib')
joblib.dump(meta_metadata, meta_metadata_path)
print(f"✓ Meta-learner metadata saved to {meta_metadata_path}")

# Update model metrics CSV
comparison_df.to_csv(os.path.join(MODELS_DIR, 'model_metrics.csv'), index=False)
print(f"✓ Updated model_metrics.csv with meta-learner results")

# Display feature importance if available
if hasattr(best_meta_model, 'feature_importances_'):
    print("\n" + "=" * 70)
    print("Meta-Learner Feature Importance")
    print("=" * 70)
    importances = best_meta_model.feature_importances_
    for i, (feat_name, importance) in enumerate(zip(meta_feature_names, importances)):
        print(f"  {feat_name:40s}: {importance:.4f}")
elif hasattr(best_meta_model, 'coef_'):
    print("\n" + "=" * 70)
    print("Meta-Learner Feature Coefficients")
    print("=" * 70)
    coefficients = best_meta_model.coef_[0]
    for i, (feat_name, coef) in enumerate(zip(meta_feature_names, coefficients)):
        print(f"  {feat_name:40s}: {coef:+.4f}")

print("\n" + "=" * 70)
print("META-LEARNER TRAINING COMPLETE!")
print("=" * 70)
print(f"\nMeta-Learner Type: {best_meta_name}")
print(f"Base Models Used: {', '.join(base_models.keys())}")
print(f"Final F1 Score: {f1:.4f}")
print(f"Final ROC-AUC: {roc_auc:.4f}")
print("\nThe meta-learner is now available in inference.py")
print("Use model_name='meta_learner' for predictions")
print("=" * 70)
