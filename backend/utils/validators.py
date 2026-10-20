"""
FraudGuard - Request Validation Helpers
"""

# Maximum size (in bytes) of a single request body.  Prevents a malicious
# caller from flooding the prediction pipeline with an oversized payload.
MAX_REQUEST_BYTES = 1_000_000  # 1 MiB

# Whitelists of valid categorical values.  Any value outside these lists is
# rejected at the validation layer instead of being silently mapped to the
# most-common training class — that silent mapping hides bad input.
VALID_CATEGORICAL_VALUES = {
    'device_type': {'Desktop', 'Mobile', 'Tablet'},
    'browser': {'Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'},
    'operating_system': {'Windows', 'macOS', 'Linux', 'Android', 'iOS'},
    'ad_position': {'Top', 'Bottom', 'Side'},
    'device_ip_reputation': {'Good', 'Suspicious', 'Poor'},
}

# Inclusive (min, max) ranges for the numerical features.  These mirror the
# physical meaning of the features and give the model sane inputs.
NUMERICAL_RANGES = {
    'click_duration':        (0.0, 30.0),
    'scroll_depth':          (0.0, 100.0),
    'mouse_movement':        (0.0, 1000.0),
    'keystrokes_detected':   (0.0, 100.0),
    'click_frequency':       (0.0, 50.0),
    'time_since_last_click': (0.0, 1000.0),
    'bot_likelihood_score':  (0.0, 1.0),
}

# The 15 fields every prediction request must carry.
REQUIRED_CLICK_FIELDS = {
    'device_type': str,
    'browser': str,
    'operating_system': str,
    'ad_position': str,
    'device_ip_reputation': str,
    'click_duration': (int, float),
    'scroll_depth': (int, float),
    'mouse_movement': (int, float),
    'keystrokes_detected': (int, float),
    'click_frequency': (int, float),
    'time_since_last_click': (int, float),
    'bot_likelihood_score': (int, float),
    'VPN_usage': (int, float),
    'proxy_usage': (int, float),
}

# Fields the client may optionally send.  `timestamp` is parsed into the
# hour/day_of_week/is_weekend features; the others are identifiers that the
# model ignores but the API keeps for traceability.
OPTIONAL_CLICK_FIELDS = {
    'timestamp': str,
    'click_id': str,
    'user_id': str,
    'ip_address': str,
}

VALID_MODEL_NAMES = [
    'random_forest',
    'xgboost',
    'neural_network',
    'meta_learner',
    'ensemble',
]


def _type_name(expected):
    """Return a human-readable type name for a validation spec."""
    if isinstance(expected, type):
        return expected.__name__
    return '/'.join(t.__name__ for t in expected)


def validate_click_data(data: dict) -> list[str]:
    """
    Validate that *data* contains all required fields with correct types
    and sane values.

    Returns a list of human-readable error strings (empty = valid).
    """
    errors = []
    if not isinstance(data, dict):
        return ['Request body must be a JSON object']

    # --- Required field presence & type ---
    for field, expected in REQUIRED_CLICK_FIELDS.items():
        if field not in data:
            errors.append(f"Missing required field: '{field}'")
        elif not isinstance(data[field], expected):
            errors.append(
                f"Field '{field}' must be of type {_type_name(expected)}, "
                f"got {type(data[field]).__name__}"
            )

    # --- Categorical whitelist ---
    for field, allowed in VALID_CATEGORICAL_VALUES.items():
        if field in data and isinstance(data[field], str) and data[field] not in allowed:
            errors.append(
                f"Field '{field}' has invalid value '{data[field]}'. "
                f"Choose from: {', '.join(sorted(allowed))}"
            )

    # --- Numerical range checks ---
    for field, (lo, hi) in NUMERICAL_RANGES.items():
        if field in data and isinstance(data[field], (int, float)):
            if data[field] < lo or data[field] > hi:
                errors.append(
                    f"Field '{field}' value {data[field]} is out of range "
                    f"[{lo}, {hi}]"
                )

    # --- Binary flag checks (must be 0/1) ---
    for field in ('VPN_usage', 'proxy_usage'):
        if field in data and isinstance(data[field], (int, float)):
            if data[field] not in (0, 1):
                errors.append(
                    f"Field '{field}' must be 0 or 1, got {data[field]}"
                )

    # --- Optional timestamp format check ---
    if 'timestamp' in data and data['timestamp'] is not None:
        ts = data['timestamp']
        if not isinstance(ts, str):
            errors.append("Field 'timestamp' must be a string")
        else:
            import datetime as _dt
            # Accept "YYYY-MM-DD HH:MM:SS" (the format the frontend sends).
            try:
                _dt.datetime.strptime(ts, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                errors.append(
                    "Field 'timestamp' must match format 'YYYY-MM-DD HH:MM:SS'"
                )

    return errors


def validate_model_name(name: str) -> str | None:
    """Return an error string if *name* is not a recognised model, else None."""
    if name not in VALID_MODEL_NAMES:
        return f"Unknown model '{name}'. Choose from: {', '.join(VALID_MODEL_NAMES)}"
    return None