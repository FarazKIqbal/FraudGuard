FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (needed for some ML libraries).
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ nodejs npm \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files first for layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the RF retraining script into the image and run it so the committed
# random_forest_model.joblib never exceeds GitHub's 100 MB limit.
COPY scripts/train_rf.py /app/scripts/train_rf.py
RUN python /app/scripts/train_rf.py

# Build the React frontend for production.
COPY frontend/ ./frontend/
WORKDIR /app/frontend
RUN npm ci && npm run build
WORKDIR /app

# Copy application code.
COPY . .

# Serve the built frontend via Flask static files.
ENV FLASK_ENV=production

# Port the app listens on.
EXPOSE 5000

# Run the Flask app via gunicorn in production.
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "3", "--timeout", "60", "wsgi:app"]