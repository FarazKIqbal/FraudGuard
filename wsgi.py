"""
WSGI entry point for production deployments (gunicorn, uWSGI, etc.).
Run with:  gunicorn wsgi:app
"""
from backend.app import create_app

app = create_app()