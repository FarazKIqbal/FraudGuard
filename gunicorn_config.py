"""
Gunicorn configuration for FraudGuard production deployments.

Usage:
    gunicorn --config gunicorn_config.py wsgi:app
"""

import os

# Bind address — set PORT env var in your platform (Heroku, Railway, Render).
bind = os.environ.get("BIND", "0.0.0.0:5000")

# Worker count: 3 × CPU cores + 1 is the gunicorn default recommendation.
workers = int(os.environ.get("WEB_CONCURRENCY", 3))

# Worker class: sync workers are fine for CPU-bound ML inference.
worker_class = "sync"

# Timeout — ML inference on a batch can take a few seconds.
timeout = int(os.environ.get("GUNICORN_TIMEOUT", 60))

# Graceful shutdown.
graceful_timeout = 30

# Logging.
accesslog = "-"
errorlog = "-"
loglevel = os.environ.get("LOG_LEVEL", "info")

# Don't preload the app — we want each worker to load its own models.
preload_app = False