FROM python:3.11-slim

WORKDIR /app

# Install build tools needed by some ML wheels.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files first for layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# The full RF artifact is too large for GitHub's file limit. Generate the
# lightweight deployment version from the tracked processed training data.
RUN python scripts/train_rf.py

ENV FLASK_ENV=production

# Render provides PORT at runtime. One worker keeps the ML service within the
# free plan memory limit; threads still allow health checks while a request runs.
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-5000} --workers ${WEB_CONCURRENCY:-1} --threads ${GUNICORN_THREADS:-2} --timeout ${GUNICORN_TIMEOUT:-120} wsgi:app"]