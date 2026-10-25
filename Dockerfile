FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (needed for some ML libraries).
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files first for layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code.
COPY . .

# Create the models directory (populated at runtime from committed metadata
# + downloaded binaries, or pre-built into the image).
RUN mkdir -p models dataset/processed

# Port the app listens on.
EXPOSE 5000

# Run the Flask app via gunicorn in production.
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "3", "--timeout", "60", "wsgi:app"]