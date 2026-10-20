"""
FraudGuard - Structured request logging.

Logs every prediction request as a single JSON line so the output can be
piped to log aggregators (ELK, Loki, etc.) or grepped directly.

Each log line contains:
  - request_id : unique per request (correlates request <-> response)
  - method, path, status, latency_ms
  - model      : the model that served the request (if any)
  - client_ip  : remote address
  - error      : short message when the request failed
"""

import json
import logging
import os
import time
import uuid

from flask import request, g


def _make_logger():
    """Build a JSON-formatted logger writing to stdout (and optionally a file)."""
    logger = logging.getLogger('fraudguard')
    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)
    logger.propagate = False

    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter('%(message)s'))
    logger.addHandler(handler)

    # Optional file sink for production deployments.
    log_file = os.environ.get('FRAUDGUARD_LOG_FILE')
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(logging.Formatter('%(message)s'))
        logger.addHandler(file_handler)

    return logger


_logger = _make_logger()


def before_request():
    """Flask before_request hook — stamp the request with an id + start time."""
    g.request_id = str(uuid.uuid4())
    g.start_time = time.perf_counter()
    g.client_ip = request.remote_addr or 'unknown'


def after_request(response):
    """Flask after_request hook — emit one JSON log line per request."""
    latency_ms = (time.perf_counter() - g.get('start_time', time.perf_counter())) * 1000

    record = {
        'request_id': g.get('request_id'),
        'method': request.method,
        'path': request.path,
        'status': response.status_code,
        'latency_ms': round(latency_ms, 2),
        'client_ip': g.get('client_ip'),
    }

    # Surface the model used / error message when present in the JSON body.
    try:
        payload = response.get_json(silent=True)
    except Exception:
        payload = None
    if isinstance(payload, dict):
        if payload.get('model_used'):
            record['model'] = payload['model_used']
        if payload.get('status') == 'error' and payload.get('message'):
            record['error'] = payload['message']

    _logger.info(json.dumps(record))
    return response


def log_prediction(model_name, is_fraudulent, fraud_probability, latency_ms=None):
    """Emit a dedicated prediction log line (used by the prediction routes)."""
    record = {
        'request_id': g.get('request_id'),
        'event': 'prediction',
        'model': model_name,
        'is_fraudulent': bool(is_fraudulent),
        'fraud_probability': round(float(fraud_probability), 4),
    }
    if latency_ms is not None:
        record['latency_ms'] = round(latency_ms, 2)
    _logger.info(json.dumps(record))


def get_logger():
    """Return the shared structured logger."""
    return _logger