"""
FraudGuard - Flask Application Factory
"""

import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Add project root to path so src/ is importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.config import config_by_name


def create_app(config_name=None):
    """
    Flask application factory.

    Parameters
    ----------
    config_name : str, optional
        One of 'development', 'production', 'testing'. Defaults to
        the FLASK_ENV environment variable or 'development'.
    """
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config_by_name.get(config_name, config_by_name['default']))

    # Enable CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # ------------------------------------------------------------------
    # Structured request logging — one JSON line per request.
    # ------------------------------------------------------------------
    from backend.utils.logging import before_request, after_request
    app.before_request(before_request)
    app.after_request(after_request)

    # ------------------------------------------------------------------
    # Lazy-load the FraudDetector so it is created once and shared across
    # all requests.  Stored on the app so blueprints can reach it via
    # current_app.config['detector'].
    # ------------------------------------------------------------------
    from src.inference import FraudDetector
    detector = FraudDetector(models_dir=app.config['MODELS_DIR'])
    app.config['detector'] = detector

    # ------------------------------------------------------------------
    # Register blueprints
    # ------------------------------------------------------------------
    from backend.routes.prediction import prediction_bp
    from backend.routes.models import models_bp
    from backend.routes.health import health_bp
    from backend.routes.analytics import analytics_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(prediction_bp, url_prefix='/api')
    app.register_blueprint(models_bp, url_prefix='/api')
    app.register_blueprint(analytics_bp, url_prefix='/api')

    # ------------------------------------------------------------------
    # Rate limiting for the prediction endpoints.
    # ------------------------------------------------------------------
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=[],
        storage_uri=os.environ.get("REDIS_URL")
    )
    # Strict limits on /api/predict (the hot path).
    limiter.limit("60 per minute")(prediction_bp)
    limiter.limit("1000 per day")(prediction_bp)

    # ------------------------------------------------------------------
    # Root endpoint
    # ------------------------------------------------------------------
    @app.route('/')
    def index():
        return jsonify({
            'service': 'FraudGuard API',
            'version': '1.0.0',
            'status': 'online',
            'docs': '/api/docs',
        })

    @app.route('/api/docs')
    def api_docs():
        return jsonify({
            'service': 'FraudGuard API',
            'version': '1.0.0',
            'endpoints': {
                'Health': {
                    'GET /api/health': 'Health check',
                    'GET /api/health/ready': 'Readiness probe (models loaded)',
                },
                'Prediction': {
                    'POST /api/predict': 'Predict fraud for a single click',
                    'POST /api/predict/batch': 'Predict fraud for multiple clicks',
                    'POST /api/predict/all-models': 'Get predictions from every model',
                },
                'Models': {
                    'GET /api/models': 'List available models with metadata',
                    'GET /api/models/metrics': 'Performance metrics for all models',
                    'GET /api/models/features': 'Feature names used by the models',
                },
                'Analytics': {
                    'POST /api/analytics/risk-score': 'Compute a weighted risk score',
                    'GET /api/analytics/dataset/stats': 'Training dataset statistics',
                },
            }
        })

    # ------------------------------------------------------------------
    # Global error handlers
    # ------------------------------------------------------------------
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({'status': 'error', 'message': 'Bad request', 'details': str(e)}), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'status': 'error', 'message': 'Endpoint not found'}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({'status': 'error', 'message': 'Method not allowed'}), 405

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500

    return app
