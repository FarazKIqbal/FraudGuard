FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (needed for some ML libraries).
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ nodejs npm \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files first for layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Build the React frontend for production.
COPY frontend/ ./frontend/
WORKDIR /app/frontend
RUN npm ci && npm run build
WORKDIR /app

# Copy application code.
COPY . .

# Create the models directory and retrain a lighter Random Forest
# so the committed binary never exceeds GitHub's 100 MB limit.
RUN mkdir -p models dataset/processed && \
    python -c " \
import pandas as pd, numpy as np, joblib, os; \
from sklearn.ensemble import RandomForestClassifier; \
meta = joblib.load('models/feature_metadata.joblib'); \
train = pd.read_csv('dataset/processed/train_data.csv'); \
test = pd.read_csv('dataset/processed/test_data.csv'); \
X = train[meta['feature_order']]; y = train[meta['target']]; \
m = RandomForestClassifier(n_estimators=100, max_depth=12, min_samples_split=10, min_samples_leaf=4, random_state=42, n_jobs=-1, class_weight='balanced'); \
m.fit(X, y); joblib.dump(m, 'models/random_forest_model.joblib'); \
print('RF retrained, size:', round(os.path.getsize('models/random_forest_model.joblib')/1024/1024, 1), 'MB') \
"

# Serve the built frontend via Flask static files.
ENV FLASK_ENV=production

# Port the app listens on.
EXPOSE 5000

# Run the Flask app via gunicorn in production.
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "3", "--timeout", "60", "wsgi:app"]
