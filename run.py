"""
FraudGuard – Application entry point.
Run with:  python run.py
"""

from backend.app import create_app

app = create_app()

if __name__ == '__main__':
    print("=" * 60)
    print("  FraudGuard API Server")
    print("=" * 60)
    print()
    print("  Endpoints:")
    print("  ──────────────────────────────────────────────")
    print("  GET  /                         → API info")
    print("  GET  /api/docs                 → Full route list")
    print("  GET  /api/health               → Liveness check")
    print("  GET  /api/health/ready          → Readiness probe")
    print("  POST /api/predict              → Single prediction")
    print("  POST /api/predict/batch        → Batch prediction")
    print("  POST /api/predict/all-models   → All-model compare")
    print("  GET  /api/models               → Model info")
    print("  GET  /api/models/metrics       → Performance metrics")
    print("  GET  /api/models/features      → Feature names")
    print("  POST /api/analytics/risk-score → Weighted risk score")
    print("  GET  /api/analytics/dataset/stats → Dataset stats")
    print("  ──────────────────────────────────────────────")
    print()

    app.run(host='0.0.0.0', port=5000, debug=True)
