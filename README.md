<div align="center">

# FraudGuard

**Real-time ad-click fraud detection powered by a stacked ensemble of Random Forest, XGBoost, Neural Network, and Logistic Regression meta-learner.**

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB.svg)](https://python.org)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933.svg)](https://nodejs.org)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000.svg)](https://flask.palletsprojects.com)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF.svg)](https://vite.dev)
[![React Router](https://img.shields.io/badge/React_Router-6-CA4245.svg)](https://reactrouter.com)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.3-F7931E.svg)](https://scikit-learn.org)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.0-337AB7.svg)](https://xgboost.readthedocs.io)
[![pandas](https://img.shields.io/badge/pandas-2.0-150458.svg)](https://pandas.pydata.org)
[![NumPy](https://img.shields.io/badge/NumPy-1.24-013243.svg)](https://numpy.org)
[![Flask-Cors](https://img.shields.io/badge/Flask--Cors-4.0-0D73C4.svg)](https://github.com/corydolphin/flask-cors)
[![Flask-Limiter](https://img.shields.io/badge/Flask--Limiter-3.5-00B4D8.svg)](https://flask-limiter.readthedocs.io)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## What Is This

FraudGuard scores every ad click in **milliseconds** against a stacked ensemble of four machine-learning models. It takes 17 signals — device, browser, ad position, click duration, scroll depth, mouse movement, IP reputation, VPN/proxy flags — and returns a fraud probability, a verdict, and the reasoning behind it.

**The problem:** Click fraud costs the ad industry **$22 billion annually**. Bots and click farms generate millions of near-identical clicks that individually look harmless but collectively drain budgets and corrupt analytics.

**The solution:** FraudGuard runs three diverse base models in parallel (Random Forest, XGBoost, Neural Network), feeds their predictions and probabilities into a logistic-regression meta-learner, and surfaces an explainable risk score with per-model breakdowns — all behind a Flask REST API and a dark-themed React dashboard.

---

## Why It's Needed

| Failure Mode | How FraudGuard Fixes It |
|--------------|-------------------------|
| **Fixed thresholds miss fraud** — With ~25% fraud rate, accuracy-tuned models wave through blocks of fraudulent clicks | Per-request threshold override (`?threshold=0.3`) + training-tuned defaults (RF 0.35, XGB 0.30, NN 0.30) |
| **Black-box verdicts aren't actionable** — Scores without reasons get ignored | Every prediction returns per-model contributions, a 0–100 risk meter, and the specific factors that triggered the flag |

---

## Quick Start

**Prerequisites:** Python 3.10+, Node.js 18+

```bash
# 1. Backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux
pip install -r requirements.txt

# 2. Frontend
cd frontend && npm install && cd ..

# 3. Train models (one-time, ~2 min)
python scripts/preprocess_data.py
python scripts/train_models.py
python scripts/train_metalearner.py

# 4. Run (two terminals)
python run.py                    # Flask API on :5000
cd frontend && npm run dev       # Vite on :3000
```

Open **http://localhost:3000** → Dashboard shows live model metrics and dataset stats.

---

## API in 30 Seconds

```bash
# Score a suspicious click
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "device_type": "Desktop", "browser": "Firefox", "operating_system": "Windows",
    "ad_position": "Bottom", "device_ip_reputation": "Suspicious",
    "click_duration": 0.1, "scroll_depth": 5, "mouse_movement": 10,
    "keystrokes_detected": 0, "click_frequency": 15,
    "time_since_last_click": 5, "bot_likelihood_score": 0.95,
    "VPN_usage": 1, "proxy_usage": 1, "timestamp": "2024-08-23 02:15:00"
  }'
```

```json
{
  "status": "success",
  "prediction": "fraudulent",
  "confidence": 0.5908,
  "fraud_probability": 0.5908,
  "legitimate_probability": 0.4092,
  "model_used": "meta_learner"
}
```

A legitimate click (2.5 s dwell, 60% scroll, no VPN) returns `"prediction": "legitimate"` with fraud probability `0.1142`.

### Key Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/predict` | Single click — model & threshold via query params |
| `POST` | `/api/predict/batch` | Multiple clicks (`{"clicks": [...]}`) |
| `POST` | `/api/predict/all-models` | Every model's opinion + consensus |
| `GET`  | `/api/models/metrics` | Accuracy, precision, recall, F1, ROC-AUC |
| `GET`  | `/api/models/<name>/importance` | Feature importances or meta coefficients |
| `POST` | `/api/analytics/risk-score` | Weighted 0–100 risk score + factors |
| `GET`  | `/api/health/ready` | Readiness probe — 200 only when all models loaded |

**Query params:** `model` (default `meta_learner`), `threshold` (0.0–1.0, default from training).

---

## Model Performance

Measured on held-out 10,000-click test split (training run 12 Oct 2026).

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC |
|-------|----------|-----------|--------|-----|---------|
| Random Forest | 0.7711 | 0.545 | **0.479** | **0.510** | 0.7629 |
| XGBoost | 0.7489 | 0.495 | **0.507** | 0.501 | 0.7456 |
| Neural Network | 0.7715 | 0.564 | 0.357 | 0.438 | 0.7644 |
| **Meta-Learner** | **0.7753** | **0.575** | 0.370 | 0.450 | **0.7663** |

The meta-learner leads on accuracy, precision, and ROC-AUC — it ranks clicks more reliably than any single base model. For the sharpest per-click decision boundary, use Random Forest with its tuned `0.35` threshold.

**Configuration:** RF (200 trees, max depth 20, `class_weight='balanced'`), XGBoost (200 estimators, max depth 10, `scale_pos_weight` from class balance), NN (`MLPClassifier` 128-64-32), Meta-Learner (logistic regression over 6 meta-features, 5-fold CV).

---

## Dashboard

Seven pages, React 18 + Vite 5, dark slate theme.

| Route | Purpose |
|-------|---------|
| `/` | Service status, model metrics, dataset statistics |
| `/predict` | Single-click form with model picker & threshold slider |
| `/batch` | JSON batch input → summary stats + results table |
| `/models` | Model cards, comparison table, confusion matrices |
| `/analytics` | Risk meter, per-model contributions, risk factors |
| `/how-it-works` | Architecture, feature importances, meta-learner coefficients |
| `/ad-demo` | Simulate impression → click → verdict across fraud scenarios |

---

## Python API (No HTTP)

```python
from src.inference import predict, predict_all_models, predict_batch, FraudDetector

# One-liner
result = predict(click_data, model_name='meta_learner')
# {'classification': 'FRAUD', 'fraud_probability': 0.59, 'model_used': 'meta_learner', ...}

# All models + majority-vote ensemble
results = predict_all_models(click_data)

# Batch
batch = predict_batch(clicks_list)

# Custom threshold
detector = FraudDetector(fraud_threshold=0.3)
result = detector.predict_single(click_data, model_name='meta_learner')
```

---

## Data Pipeline

Only the 5,000-row source is committed; the rest regenerates on demand.

```
dataset/click_fraud_dataset.csv            5,000 rows, real, committed
        |  scripts/expand_dataset.py  (SDV GaussianCopula, seeded)
        v
dataset/click_fraud_dataset_expanded.csv  50,000 rows, git-ignored
        |  scripts/preprocess_data.py
        v
dataset/processed/{train,test}_data.csv   committed, 40k / 10k split
        |  scripts/train_models.py + train_metalearner.py
        v
models/*.joblib                            git-ignored, ~127 MB
```

45,000 synthetic rows from a seeded Gaussian copula — identifiers regenerated to avoid collisions. Expansion is reproducible (`--seed 42`).

---

## Documentation

- [Preprocessing guide](docs/PREPROCESSING_README.md) — feature engineering, artifact layout, reusable pipeline
- [Final report](Final_Report%20(2).pdf) — methodology and results write-up

---

## License

MIT — see [LICENSE](LICENSE).

---

## About the Author

| | |
|:---|:---|
| GitHub | [FarazKIqbal](https://github.com/FarazKIqbal) |
| Repository | [FarazKIqbal/FraudGuard](https://github.com/FarazKIqbal/FraudGuard) |