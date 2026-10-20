"""
Health & readiness routes
"""

from flask import Blueprint, jsonify, current_app

health_bp = Blueprint('health', __name__)


@health_bp.route('/api/health', methods=['GET'])
def health():
    """Basic liveness check - always returns 200 if the process is up."""
    return jsonify({
        'status': 'healthy',
        'service': 'FraudGuard API',
    })


@health_bp.route('/api/health/ready', methods=['GET'])
def readiness():
    """
    Readiness probe - returns 200 only when models are loaded and
    the service can accept prediction requests.
    """
    detector = current_app.config.get('detector')
    if detector is None or not detector.models:
        return jsonify({
            'status': 'not ready',
            'reason': 'Models not loaded',
        }), 503

    # Build a dict of model names so the frontend can use Object.keys()
    loaded = {name: True for name in detector.models}
    if detector.meta_learner:
        loaded['meta_learner'] = True

    return jsonify({
        'status': 'ready',
        'models_loaded': loaded,
        'meta_learner_available': detector.meta_learner is not None,
    })
