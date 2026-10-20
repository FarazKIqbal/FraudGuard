"""
Analytics routes – risk scoring and dataset statistics.
"""

import os
import pandas as pd
from flask import Blueprint, request, jsonify, current_app
from backend.utils.validators import validate_click_data

analytics_bp = Blueprint('analytics', __name__)


# ------------------------------------------------------------------ #
# POST /api/analytics/risk-score  –  weighted risk score
# ------------------------------------------------------------------ #
@analytics_bp.route('/analytics/risk-score', methods=['POST'])
def risk_score():
    """
    Compute a composite **risk score** (0-100) for a click by combining
    all model outputs with configurable weights.

    The default weights:
    - meta_learner  : 0.40
    - neural_network: 0.25
    - random_forest : 0.20
    - xgboost       : 0.15

    **Request body** – same click object as `/api/predict`.

    **Optional query params**
    - `threshold` (float, default 50): score above this is flagged as fraud.

    **Response 200**
    ```json
    {
      "status": "success",
      "risk_score": 73.4,
      "risk_level": "HIGH",
      "is_flagged": true,
      "threshold": 50,
      "model_contributions": { … }
    }
    ```
    """
    click_data = request.get_json(silent=True)
    if click_data is None:
        return jsonify({'status': 'error', 'message': 'Request body must be valid JSON'}), 400

    errors = validate_click_data(click_data)
    if errors:
        return jsonify({'status': 'error', 'message': 'Validation failed', 'errors': errors}), 422

    threshold = request.args.get('threshold', 50, type=float)

    try:
        detector = current_app.config['detector']
        all_results = detector.predict_single(click_data, return_all_models=True)

        # Default weights (meta_learner gets the most trust)
        weights = {
            'meta_learner': 0.40,
            'neural_network': 0.25,
            'random_forest': 0.20,
            'xgboost': 0.15,
        }

        # Build weighted score from whatever models are available
        total_weight = 0.0
        weighted_sum = 0.0
        contributions = {}

        for model_name, w in weights.items():
            if model_name in all_results:
                prob = all_results[model_name]['fraud_probability']
                weighted_sum += prob * w
                total_weight += w
                contributions[model_name] = {
                    'prediction': 'fraudulent' if all_results[model_name]['is_fraudulent'] else 'legitimate',
                    'confidence': all_results[model_name]['confidence_score'],
                    'fraud_probability': round(prob, 4),
                    'weight': w,
                    'weighted_score': round(prob * w, 4),
                }

        # Normalise to 0-100 scale
        risk_score = round((weighted_sum / total_weight) * 100, 2) if total_weight > 0 else 0.0

        # Risk level bands
        if risk_score >= 75:
            risk_level = 'CRITICAL'
        elif risk_score >= 50:
            risk_level = 'HIGH'
        elif risk_score >= 25:
            risk_level = 'MEDIUM'
        else:
            risk_level = 'LOW'

        # Risk assessment / recommendation / risk factors for the frontend
        risk_assessment = 'HIGH_RISK' if risk_score >= threshold else 'LOW_RISK'

        recommendation = (
            'Block this click immediately — high fraud probability.'
            if risk_level == 'CRITICAL' else
            'Flag for manual review — elevated fraud signals.'
            if risk_level == 'HIGH' else
            'Monitor — moderate fraud indicators present.'
            if risk_level == 'MEDIUM' else
            'Allow — low fraud probability.'
        )

        risk_factors = []
        if risk_score >= 50:
            risk_factors.append('Composite risk score exceeds 50%')
        for mn, c in contributions.items():
            if c['fraud_probability'] >= 0.7:
                risk_factors.append(f'{mn} reports ≥70 % fraud probability')
        if all(c['prediction'] == 'fraudulent' for c in contributions.values()):
            risk_factors.append('All models agree on fraud classification')

        return jsonify({
            'status': 'success',
            'risk_score': risk_score,
            'risk_level': risk_level,
            'risk_assessment': risk_assessment,
            'recommendation': recommendation,
            'is_flagged': risk_score >= threshold,
            'threshold': threshold,
            'model_contributions': contributions,
            'risk_factors': risk_factors,
        })

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ------------------------------------------------------------------ #
# GET /api/analytics/dataset/stats  –  training data statistics
# ------------------------------------------------------------------ #
@analytics_bp.route('/analytics/dataset/stats', methods=['GET'])
def dataset_stats():
    """
    Return high-level statistics about the training dataset (row counts,
    fraud ratio, feature distributions).

    **Response 200**
    ```json
    {
      "status": "success",
      "stats": { … }
    }
    ```
    """
    processed_dir = os.path.join(current_app.config['DATASET_DIR'], 'processed')
    train_path = os.path.join(processed_dir, 'train_data.csv')
    test_path = os.path.join(processed_dir, 'test_data.csv')

    if not os.path.exists(train_path):
        return jsonify({
            'status': 'error',
            'message': 'Processed training data not found. Run preprocessing first.',
        }), 404

    train_df = pd.read_csv(train_path)
    test_df = pd.read_csv(test_path) if os.path.exists(test_path) else None

    train_fraud = int(train_df['is_fraudulent'].sum())
    train_total = len(train_df)

    data = {
        'training_data': {
            'total_samples': train_total,
            'fraud_count': train_fraud,
            'legitimate_count': train_total - train_fraud,
            'fraud_percentage': round((train_fraud / train_total) * 100, 2),
            'num_features': len(train_df.columns) - 1,   # exclude target column
        },
    }

    if test_df is not None:
        test_fraud = int(test_df['is_fraudulent'].sum())
        test_total = len(test_df)
        data['test_data'] = {
            'total_samples': test_total,
            'fraud_count': test_fraud,
            'legitimate_count': test_total - test_fraud,
            'fraud_percentage': round((test_fraud / test_total) * 100, 2),
            'num_features': len(test_df.columns) - 1,
        }

    data['total_samples'] = train_total + (len(test_df) if test_df is not None else 0)

    return jsonify({'status': 'success', 'data': data})
