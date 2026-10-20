"""
Model information routes – metadata, metrics, feature names, and importance.
"""

import os
import joblib
from flask import Blueprint, jsonify, current_app, abort

models_bp = Blueprint('models', __name__)


def _get_model_or_404(model_name):
    """Return the loaded model object or raise 404."""
    detector = current_app.config['detector']
    if model_name == 'meta_learner':
        if detector.meta_learner is None:
            abort(404, description="Meta-learner not loaded")
        return detector.meta_learner
    if model_name not in detector.models:
        abort(404, description=f"Model '{model_name}' not loaded")
    return detector.models[model_name]


def _feature_metadata():
    """Read feature metadata from the models directory (request-scoped)."""
    models_dir = current_app.config['MODELS_DIR']
    path = os.path.join(models_dir, 'feature_metadata.joblib')
    if os.path.exists(path):
        return joblib.load(path)
    return None


# ------------------------------------------------------------------ #
# GET /api/models  –  available models and metadata
# ------------------------------------------------------------------ #
@models_bp.route('/models', methods=['GET'])
def list_models():
    """
    Return a list of loaded models with training metadata.

    **Response 200**
    ```json
    {
      "status": "success",
      "data": { … }
    }
    ```
    """
    detector = current_app.config['detector']
    info = detector.get_model_info()
    return jsonify({'status': 'success', 'data': info})


# ------------------------------------------------------------------ #
# GET /api/models/metrics  –  performance metrics
# ------------------------------------------------------------------ #
@models_bp.route('/models/metrics', methods=['GET'])
def model_metrics():
    """
    Return accuracy, precision, recall, F1, ROC-AUC for every trained
    model (read from the saved model_metrics.csv).

    **Response 200**
    ```json
    {
      "status": "success",
      "metrics": [ { "model": "…", … }, … ]
    }
    ```
    """
    metrics_path = os.path.join(current_app.config['MODELS_DIR'], 'model_metrics.csv')
    if not os.path.exists(metrics_path):
        return jsonify({
            'status': 'error',
            'message': 'Metrics file not found. Train models first.',
        }), 404

    df = pd.read_csv(metrics_path)
    records = df.to_dict(orient='records')

    return jsonify({'status': 'success', 'data': records})


# ------------------------------------------------------------------ #
# GET /api/models/features  –  feature list
# ------------------------------------------------------------------ #
@models_bp.route('/models/features', methods=['GET'])
def feature_names():
    """
    Return the ordered list of input features the models expect.

    **Response 200**
    ```json
    {
      "status": "success",
      "features": {
        "all": ["device_type", …],
        "categorical": [ … ],
        "numerical": [ … ],
        "binary": [ … ]
      }
    }
    ```
    """
    metadata_path = os.path.join(current_app.config['MODELS_DIR'], 'feature_metadata.joblib')
    if not os.path.exists(metadata_path):
        return jsonify({'status': 'error', 'message': 'Feature metadata not found.'}), 404

    meta = joblib.load(metadata_path)
    return jsonify({
        'status': 'success',
        'data': {
            'all': meta['feature_order'],
            'categorical': meta['categorical_features'],
            'numerical': meta['numerical_features'],
            'binary': meta['binary_features'],
        }
    })


# ------------------------------------------------------------------ #
# GET /api/models/<model_name>/importance  –  feature importance
# ------------------------------------------------------------------ #
@models_bp.route('/models/<model_name>/importance', methods=['GET'])
def model_importance(model_name):
    """
    Return feature importance or coefficient data for a loaded model.

    **Response 200**
    ```json
    {
      "status": "success",
      "data": {
        "features": ["device_type", …],
        "importances": [0.023, …]
      }
    }
    ```
    or for the meta-learner:
    ```json
    {
      "status": "success",
      "data": {
        "meta_features": ["random_forest_prediction", …],
        "coefficients": [0.45, …]
      }
    }
    ```
    """
    model = _get_model_or_404(model_name)
    detector = current_app.config['detector']
    meta = _feature_metadata()

    # Tree-based models: expose feature_importances_
    if hasattr(model, 'feature_importances_'):
        importances = model.feature_importances_.tolist()
        # Map to the 17 expected feature names
        feature_order = meta.get('feature_order', []) if meta else []
        # Truncate/pad to exactly feature_order length
        idx = 0
        features = []
        importances_out = []
        for fname in feature_order:
            if idx < len(importances):
                features.append(fname)
                importances_out.append(importances[idx])
                idx += 1
            else:
                features.append(fname)
                importances_out.append(0.0)
        return jsonify({
            'status': 'success',
            'data': {
                'features': features,
                'importances': importances_out,
            },
        })

    # Meta-learner (LogisticRegression): expose coef_ on meta-features
    if hasattr(model, 'coef_'):
        coefficients = model.coef_[0].tolist()
        meta_feature_names = (
            detector.meta_learner_metadata.get('meta_feature_names', [])
            if detector.meta_learner_metadata
            else []
        )
        features = meta_feature_names[: len(coefficients)] + [
            None
        ] * (len(meta_feature_names) - len(coefficients))
        coefficients = coefficients[: len(meta_feature_names)] + [
            0.0
        ] * (len(meta_feature_names) - len(coefficients))
        return jsonify({
            'status': 'success',
            'data': {
                'meta_features': features,
                'coefficients': coefficients,
            },
        })

    # Unknown model type
    abort(404, description=f"Model '{model_name}' does not expose importance/coefficient data")
