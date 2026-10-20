# FraudGuard - Click Fraud Detection System

A full-stack machine learning system for detecting fraudulent ad clicks, featuring ensemble learning, a Flask REST API, and a React dashboard.

## 🎯 Overview

FraudGuard uses multiple machine learning models to identify fraudulent clicks with high accuracy:
- **Random Forest**: Ensemble decision tree classifier
- **XGBoost**: Gradient boosting framework
- **Neural Network**: Multi-layer perceptron
- **Meta-Learner**: Stacking ensemble combining all models

The system includes a **Flask REST API** with 12 endpoints and a **React + Vite** dark-themed dashboard for real-time fraud analysis.

## 📊 Performance

| Model | Accuracy | Precision | Recall | F1-Score | ROC-AUC |
|-------|----------|-----------|--------|----------|---------|
| Random Forest | 77.46% | 58.38% | 32.65% | 41.88% | 76.40% |
| XGBoost | 76.61% | 55.00% | 32.73% | 41.04% | 74.77% |
| Neural Network | 77.15% | 56.41% | 35.75% | **43.76%** | 76.44% |
| Meta-Learner | **78.29%** | **58.91%** | **37.82%** | **45.94%** | **77.57%** |

*Meta-learner shows ~5% improvement over best base model*

## 🗂️ Project Structure

```
FraudGuard/
├── src/                          # Core source code
│   ├── __init__.py              # Package initialization
│   ├── inference.py             # ML inference engine (FraudDetector class)
│   └── preprocessing_pipeline.py # Data preprocessing module
│
├── backend/                      # Flask REST API
│   ├── app.py                   # App factory (create_app)
│   ├── config.py                # Dev / Prod / Test configs
│   ├── routes/
│   │   ├── health.py            # GET /api/health, /api/health/ready
│   │   ├── prediction.py        # POST /api/predict, /predict/batch, /predict/all-models
│   │   ├── models.py            # GET /api/models, /models/metrics, /models/features
│   │   └── analytics.py         # POST /api/analytics/risk-score, GET /analytics/dataset/stats
│   └── utils/
│       └── validators.py        # Input validation helpers
│
├── frontend/                     # React + Vite dashboard
│   ├── src/
│   │   ├── App.jsx              # Router (5 routes)
│   │   ├── index.css            # Dark theme (slate/blue palette)
│   │   ├── main.jsx             # React 18 entry point
│   │   ├── components/
│   │   │   ├── Sidebar.jsx      # Navigation sidebar
│   │   │   └── ClickForm.jsx    # Reusable click data form
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx    # System overview & metrics
│   │   │   ├── Predict.jsx      # Single click analysis
│   │   │   ├── BatchPredict.jsx # Batch JSON prediction
│   │   │   ├── Models.jsx       # Model cards & comparison
│   │   │   └── Analytics.jsx    # Risk scoring & factors
│   │   └── services/
│   │       └── api.js           # API client (all endpoints)
│   ├── package.json
│   └── vite.config.js           # Dev server + API proxy
│
├── scripts/                      # Training and data preparation
│   ├── preprocess_data.py       # Feature engineering & joblib export
│   ├── train_models.py          # Train RF, XGBoost, NN
│   └── train_metalearner.py     # Train stacking meta-learner
│
├── models/                       # Saved models & preprocessing artifacts
│   ├── random_forest_model.joblib
│   ├── xgboost_model.joblib
│   ├── neural_network_model.joblib
│   ├── meta_learner_model.joblib
│   ├── scaler.joblib
│   ├── label_encoder_*.joblib   # 5 label encoders
│   ├── feature_metadata.joblib
│   ├── model_metadata.joblib
│   ├── meta_learner_metadata.joblib
│   └── model_metrics.csv
│
├── dataset/                      # Dataset files
│   ├── click_fraud_dataset_expanded.csv
│   └── processed/
│       ├── train_data.csv
│       ├── test_data.csv
│       └── full_processed_data.csv
│
├── docs/                         # Documentation
│   └── PREPROCESSING_README.md
├── run.py                        # Flask entry point
├── requirements.txt              # Python dependencies
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+

### 1. Install Dependencies

```bash
.\.venv\Scripts\Activate.ps1
python -m pip install -r .\requirements.txt

# Frontend
cd frontend
npm install
cd ..
```

### 2. Train Models (first time only)

```bash
python scripts/preprocess_data.py
python scripts/train_models.py
python scripts/train_metalearner.py
```

> `train_models.py` now uses `class_weight='balanced'` (RF) and `scale_pos_weight`
> (XGBoost) to improve fraud recall, and writes a `best_thresholds.joblib` file.

### 3. Run the Application

Open **two terminals**:

```bash
# Terminal 1 — Backend (Flask API on port 5000)
python run.py

# Terminal 2 — Frontend (Vite dev server on port 3000)
cd frontend
npm run dev
```

Open **http://localhost:3000** in your browser.

### 4. Verify the Backend

```bash
# Health check
curl http://localhost:5000/api/health

# Single prediction with a custom fraud threshold (0.3 = more sensitive)
curl -X POST http://localhost:5000/api/predict?model=meta_learner&threshold=0.3 \
  -H "Content-Type: application/json" \
  -d '{
    "device_type": "Mobile", "browser": "Chrome", "operating_system": "Android",
    "ad_position": "Top", "device_ip_reputation": "Good",
    "click_duration": 1.5, "scroll_depth": 45, "mouse_movement": 200,
    "keystrokes_detected": 10, "click_frequency": 5,
    "time_since_last_click": 120, "bot_likelihood_score": 0.3,
    "VPN_usage": 0, "proxy_usage": 0, "timestamp": "2024-08-23 14:30:00"
  }'
```

> The backend logs one structured JSON line per request (request_id, latency,
> client_ip, model, outcome).  Rate limiting is active: 60 requests/minute and
> 1000 requests/day per IP on prediction endpoints.

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Liveness check |
| `GET` | `/api/health/ready` | Readiness probe (models loaded) |
| `POST` | `/api/predict?model=meta_learner&threshold=0.3` | Single click prediction |
| `POST` | `/api/predict/batch` | Batch prediction (JSON array) |
| `POST` | `/api/predict/all-models` | Compare all models on one click |
| `GET` | `/api/models` | Available model info |
| `GET` | `/api/models/metrics` | Performance metrics table |
| `GET` | `/api/models/features` | Feature names by category |
| `POST` | `/api/analytics/risk-score` | Composite risk score (0–100) |
| `GET` | `/api/analytics/dataset/stats` | Training & test set statistics |

### Query Parameters

- `model` — which model to use (`random_forest`, `xgboost`, `neural_network`,
  `meta_learner`, `ensemble`). Defaults to the server's configured default
  (`meta_learner`).
- `threshold` — probability above which a click is flagged as fraud
  (0.0–1.0). Defaults to the best threshold saved during training (or 0.5).
  Lowering it trades false positives for true positives — useful when fraud
  recall matters more than precision.

### Example API Call

```bash
curl -X POST http://localhost:5000/api/predict?model=meta_learner&threshold=0.3 \
  -H "Content-Type: application/json" \
  -d '{
    "device_type": "Mobile",
    "browser": "Chrome",
    "operating_system": "Android",
    "ad_position": "Top",
    "device_ip_reputation": "Good",
    "click_duration": 1.5,
    "scroll_depth": 45,
    "mouse_movement": 200,
    "keystrokes_detected": 10,
    "click_frequency": 5,
    "time_since_last_click": 120,
    "bot_likelihood_score": 0.3,
    "VPN_usage": 0,
    "proxy_usage": 0,
    "timestamp": "2024-08-23 14:30:00"
  }'
```

## 🖥️ Frontend Pages

| Page | Route | Description |
|------|-------|-------------|
| **Dashboard** | `/` | API status, model metrics table, dataset statistics |
| **Predict** | `/predict` | Single click form with model selector, all-models toggle, **fraud threshold slider** |
| **Batch Predict** | `/batch` | JSON array input with summary stats, results table, **threshold slider** |
| **Models** | `/models` | Model cards, comparison table, **confusion matrices**, feature overview |
| **Analytics** | `/analytics` | Risk score meter, model contributions, risk factors, **threshold slider** |
| **How It Works** | `/how-it-works` | Architecture diagram, feature importance bars, meta-learner coefficients, live demo |
| **Ad Demo** | `/ad-demo` | Simulate an ad impression → click → fraud prediction with scenario explorer |

## 🔧 Features

### Data Processing
- **Feature Engineering**: Extracts time-based features (hour, day_of_week, is_weekend)
- **Categorical Encoding**: Label encoding for device types, browsers, etc.
- **Numerical Scaling**: StandardScaler for numerical features
- **Handles Missing Values**: Automatic handling of unseen categories

### Models
- **Random Forest**: 200 trees, max depth 20, **class_weight='balanced'**
- **XGBoost**: 200 estimators, optimized hyperparameters, **scale_pos_weight**
- **Neural Network**: 3 hidden layers (128-64-32 neurons)
- **Meta-Learner**: Stacking with 5-fold cross-validation

### Inference Engine
- **Single Predictions**: Real-time fraud detection
- **Batch Processing**: Handle multiple clicks efficiently
- **Multi-Model Support**: Use any trained model or ensemble
- **Confidence Scores**: Detailed probability outputs
- **Configurable Decision Threshold**: Override per-request via `?threshold=`

### REST API
- **12 endpoints** organized into health, prediction, models, and analytics blueprints
- **Strict Input Validation** — range checks, categorical whitelists, binary flags, timestamp format, body size limit (1 MiB)
- **Rate Limiting** — 60 req/min, 1000 req/day per IP on prediction endpoints
- **Structured JSON Logging** — request_id, latency, client_ip, model, outcome
- **CORS enabled** for frontend integration
- **Composite risk scoring** with configurable thresholds and risk factors

### React Dashboard
- **Dark theme** (slate/blue palette) with responsive layout
- **Real-time predictions** with form pre-fill templates (suspicious / legitimate)
- **Batch analysis** with JSON input and summary statistics
- **Model comparison** cards with **confusion matrix breakdowns** (TP/FP/FN/TN, precision, recall, specificity, accuracy)
- **Interactive threshold sliders** on Predict, Batch, and Analytics pages
- **Risk meter** with color-coded levels (LOW / MEDIUM / HIGH / CRITICAL)

## 🎓 Model Details

### Input Features (17 total)

**Categorical (5):** device_type, browser, operating_system, ad_position, device_ip_reputation

**Numerical (10):** click_duration, scroll_depth, mouse_movement, keystrokes_detected, click_frequency, time_since_last_click, bot_likelihood_score, hour, day_of_week, is_weekend

**Binary (2):** VPN_usage, proxy_usage

### Meta-Learner Architecture

The meta-learner uses **stacking** with:
1. **Base Models**: Random Forest, XGBoost, Neural Network
2. **Meta-Features**: Predictions + probabilities from each base model (6 features)
3. **Meta-Model**: Logistic Regression (selected by F1 score)
4. **Cross-Validation**: 5-fold CV to prevent overfitting

## 📈 Training Data

- **Total Samples**: 50,000 clicks
- **Fraudulent**: 12,435 (24.87%)
- **Legitimate**: 37,565 (75.13%)
- **Train/Test Split**: 80/20 stratified

## 🔍 Python Usage

```python
from src.inference import predict, predict_all_models, predict_batch

# Single prediction with meta-learner (auto threshold from training)
result = predict(click_data, model_name='meta_learner')

# Single prediction with custom threshold (e.g., 0.3 for higher recall)
result = predict(click_data, model_name='meta_learner', fraud_threshold=0.3)

# Compare all models
results = predict_all_models(click_data)

# Batch processing
results = predict_batch(clicks_list, model_name='meta_learner')
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| ML Models | scikit-learn, XGBoost |
| Preprocessing | pandas, NumPy, joblib |
| Backend | Flask, flask-cors, flask-limiter |
| Frontend | React 18, Vite 5, react-router-dom 6, lucide-react |

## 📚 Documentation

- [Preprocessing Guide](docs/PREPROCESSING_README.md) - Detailed preprocessing documentation
- [API Docs](http://localhost:5000/api/docs) - Full route list (when server is running)

## 📄 License

This project is licensed under the MIT License.

---

**Built with Python, scikit-learn, XGBoost, Flask, and React**
