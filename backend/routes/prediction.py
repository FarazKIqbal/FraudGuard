"""
Prediction routes – single, batch, and all-models inference.
"""

from flask import Blueprint, request, jsonify, current_app, g
from backend.utils.validators import (
    MAX_REQUEST_BYTES,
    validate_click_data,
    validate_model_name,
)
from backend.utils.logging import log_prediction

prediction_bp = Blueprint('prediction', __name__)


def _enforce_size_limit():
    """Reject oversized request bodies before we try to parse them."""
    length = request.content_length or 0
    if length > MAX_REQUEST_BYTES:
        return jsonify({
            'status': 'error',
            'message': f'Request body too large ({length} bytes). '
                       f'Maximum allowed is {MAX_REQUEST_BYTES} bytes.',
        }), 413
    return None


# ------------------------------------------------------------------ #
# POST /api/predict  –  single click prediction
# ------------------------------------------------------------------ #
@prediction_bp.route('/predict', methods=['POST'])
def predict():
    """
    Predict whether a single click is fraudulent.

    **Request body** – JSON object with click features.

    **Query params**
    - `model` (optional): model name to use. Default is the server's
      configured default model (meta_learner).

    **Response 200**
    ```json
    {
      "status": "success",
      "prediction": {
        "is_fraudulent": true,
        "classification": "FRAUD",
        "confidence_score": 0.92,
        "fraud_probability": 0.92,
        "legitimate_probability": 0.08,
        "model_used": "meta_learner"
      }
    }
    ```
    """
    # --- Parse body ---
    too_big = _enforce_size_limit()
    if too_big:
        return too_big

    click_data = request.get_json(silent=True)
    if click_data is None:
        return jsonify({
            'status': 'error',
            'message': 'Request body must be valid JSON',
        }), 400

    # --- Validate fields ---
    errors = validate_click_data(click_data)
    if errors:
        return jsonify({
            'status': 'error',
            'message': 'Validation failed',
            'errors': errors,
        }), 422

    # --- Resolve model ---
    model_name = request.args.get('model', current_app.config['DEFAULT_MODEL'])
    model_err = validate_model_name(model_name)
    if model_err:
        return jsonify({'status': 'error', 'message': model_err}), 400

    # --- Resolve threshold ---
    fraud_threshold = request.args.get('threshold', type=float)
    # Note: a threshold of 0.0 means "flag everything", so we must check
    # `is not None` rather than truthiness.
    if fraud_threshold is not None and not (0.0 <= fraud_threshold <= 1.0):
        return jsonify({'status': 'error',
                        'message': 'threshold must be in [0.0, 1.0]'}), 400

    # --- Predict ---
    try:
        detector = current_app.config['detector']
        result = detector.predict_single(click_data, model_name=model_name,
                                         fraud_threshold=fraud_threshold)

        # Structured prediction log line (correlates with the request_id).
        log_prediction(
            model_name,
            result['is_fraudulent'],
            result['fraud_probability'],
        )

        # Flatten response so frontend can access .prediction, .confidence, .model_used directly
        return jsonify({
            'status': 'success',
            'prediction': 'fraudulent' if result['is_fraudulent'] else 'legitimate',
            'confidence': result['confidence_score'],
            'fraud_probability': result['fraud_probability'],
            'legitimate_probability': result['legitimate_probability'],
            'model_used': result['model_used'],
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ------------------------------------------------------------------ #
# POST /api/predict/batch  –  multiple clicks at once
# ------------------------------------------------------------------ #
@prediction_bp.route('/predict/batch', methods=['POST'])
def predict_batch():
    """
    Predict fraud for an array of clicks.

    **Request body**
    ```json
    {
      "clicks": [ {…}, {…} ]
    }
    ```

    **Query params**
    - `model` (optional): model name.

    **Response 200**
    ```json
    {
      "status": "success",
      "summary": {
        "total": 10,
        "fraudulent": 3,
        "legitimate": 7,
        "fraud_rate": "30.00%"
      },
      "predictions": [ … ]
    }
    ```
    """
    too_big = _enforce_size_limit()
    if too_big:
        return too_big

    body = request.get_json(silent=True)
    if body is None:
        return jsonify({'status': 'error', 'message': 'Request body must be valid JSON'}), 400

    clicks = body.get('clicks', [])
    if not isinstance(clicks, list) or len(clicks) == 0:
        return jsonify({
            'status': 'error',
            'message': "'clicks' must be a non-empty array of click objects",
        }), 422

    # Validate every click
    all_errors = {}
    for idx, click in enumerate(clicks):
        errs = validate_click_data(click)
        if errs:
            all_errors[f'click[{idx}]'] = errs
    if all_errors:
        return jsonify({
            'status': 'error',
            'message': 'Validation failed for one or more clicks',
            'errors': all_errors,
        }), 422

    model_name = request.args.get('model', current_app.config['DEFAULT_MODEL'])
    model_err = validate_model_name(model_name)
    if model_err:
        return jsonify({'status': 'error', 'message': model_err}), 400

    # --- Resolve threshold ---
    fraud_threshold = request.args.get('threshold', type=float)
    if fraud_threshold is not None and not (0.0 <= fraud_threshold <= 1.0):
        return jsonify({'status': 'error',
                        'message': 'threshold must be in [0.0, 1.0]'}), 400

    try:
        detector = current_app.config['detector']
        results = detector.predict_batch(clicks, model_name=model_name,
                                         fraud_threshold=fraud_threshold)

        fraud_count = sum(1 for r in results if r['is_fraudulent'])
        total = len(results)

        # Structured batch log line — one summary entry per batch request.
        log_prediction(
            model_name,
            fraud_count > 0,
            round(fraud_count / total, 4) if total else 0.0,
        )

        # Transform each prediction to match frontend expectations
        transformed = []
        for i, r in enumerate(results):
            transformed.append({
                'prediction': 'fraudulent' if r['is_fraudulent'] else 'legitimate',
                'confidence': r['confidence_score'],
                'fraud_probability': r['fraud_probability'],
                'legitimate_probability': r['legitimate_probability'],
                'model_used': r['model_used'],
                'input_data': clicks[i],          # include original input
            })

        return jsonify({
            'status': 'success',
            'summary': {
                'total_predictions': total,
                'fraudulent_count': fraud_count,
                'legitimate_count': total - fraud_count,
                'fraud_rate': round((fraud_count / total), 4) if total else 0,
            },
            'predictions': transformed,
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ------------------------------------------------------------------ #
# POST /api/predict/all-models  –  every model's opinion
# ------------------------------------------------------------------ #
@prediction_bp.route('/predict/all-models', methods=['POST'])
def predict_all_models():
    """
    Return predictions from every loaded model (including meta-learner
    and ensemble) for a single click.

    **Request body** – same as `/api/predict`.

    **Response 200**
    ```json
    {
      "status": "success",
      "predictions": {
        "random_forest": { … },
        "xgboost": { … },
        "neural_network": { … },
        "meta_learner": { … },
        "ensemble": { … }
      }
    }
    ```
    """
    too_big = _enforce_size_limit()
    if too_big:
        return too_big

    click_data = request.get_json(silent=True)
    if click_data is None:
        return jsonify({'status': 'error', 'message': 'Request body must be valid JSON'}), 400

    errors = validate_click_data(click_data)
    if errors:
        return jsonify({'status': 'error', 'message': 'Validation failed', 'errors': errors}), 422

    # --- Resolve threshold ---
    fraud_threshold = request.args.get('threshold', type=float)
    if fraud_threshold is not None and not (0.0 <= fraud_threshold <= 1.0):
        return jsonify({'status': 'error',
                        'message': 'threshold must be in [0.0, 1.0]'}), 400

    try:
        detector = current_app.config['detector']
        results = detector.predict_single(click_data, return_all_models=True,
                                          fraud_threshold=fraud_threshold)

        # Transform each model result so frontend can access .prediction, .confidence
        predictions = {}
        fraud_count = 0
        total_fraud_prob = 0.0
        for name, r in results.items():
            predictions[name] = {
                'prediction': 'fraudulent' if r['is_fraudulent'] else 'legitimate',
                'confidence': r['confidence_score'],
                'fraud_probability': r['fraud_probability'],
                'model_used': r['model_used'],
            }
            fraud_count += int(r['is_fraudulent'])
            total_fraud_prob += r['fraud_probability']

        total_models = len(predictions)
        avg_fraud_prob = total_fraud_prob / total_models if total_models else 0

        summary = {
            'consensus': 'fraudulent' if fraud_count > total_models / 2 else 'legitimate',
            'average_fraud_probability': round(avg_fraud_prob, 4),
            'models_predicting_fraud': fraud_count,
            'total_models': total_models,
        }

        # Log the all-models prediction with the consensus probability.
        log_prediction(
            'ensemble',
            fraud_count > total_models / 2,
            summary['average_fraud_probability'],
        )

        return jsonify({
            'status': 'success',
            'predictions': predictions,
            'summary': summary,
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
