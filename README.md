# FraudGuard

**Real-time click-fraud detection for ad networks** — a Flask REST API and React dashboard that score every ad click against a stacked ensemble of Random Forest, XGBoost, and neural-network models.

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

## What It Is

FraudGuard takes a single ad-click record — device, browser, ad position, click duration, scroll depth, mouse movement, IP reputation, VPN and proxy flags — and returns a fraud probability, a verdict, and the reasoning behind it. It ships the full loop: a preprocessing pipeline, four trained models, a Flask API, and a dark-themed React dashboard for exploring predictions side by side.

Every model is trained on the same 50,000-click dataset (24.87% fraudulent), and every prediction is served by a meta-learner that learns how to weigh the three base models against each other.

```bash
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

A normal human click — 2.5s dwell, 60% scroll depth, no VPN — comes back `"prediction": "legitimate"` with a fraud probability of `0.1142`.

## Why It's Needed

Ad fraud is a volume game: bots and click farms generate millions of near-identical clicks, each one individually cheap to ignore and collectively expensive to pay for. Two failure modes are common in existing pipelines, and FraudGuard addresses both.

**Fixed thresholds miss fraud.** Because only about one click in four is fraudulent, a model tuned for raw accuracy will happily wave through a large block of fraudulent clicks. FraudGuard lets you move the decision threshold per request, and ships thresholds tuned on the training set (Random Forest `0.35`, XGBoost `0.30`, neural network `0.30`) as the default. Lowering the threshold trades false positives for true positives.

**Black-box verdicts aren't actionable.** A score without a reason gets ignored by the people who have to act on it. Every prediction can be broken down into per-model contributions, a composite 0–100 risk score, and the specific factors that triggered the flag.

## How It Works

```
click record
   →  encode categoricals, derive hour/day_of_week/is_weekend, scale numerics (17 features)
   →  Random Forest  ┐
      XGBoost        ├→  meta-learner (logistic regression)  →  fraud probability
      Neural Network ┘
   →  threshold  →  FRAUD / LEGITIMATE  +  risk score + contributing factors
```

The meta-learner is a stacking ensemble: each base model produces a class prediction and a fraud probability, those six numbers become the meta-features, and a logistic regression combines them into the final score. Base-model outputs are returned alongside every verdict so you can see which model drove the call.

## Quick Start

**Prerequisites:** Python 3.10+, Node.js 18+

### 1. Install dependencies

```bash
# Backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux
pip install -r requirements.txt

# Frontend
cd frontend
npm install
cd ..
```

### 2. Expand the dataset (optional)

The 5,000-row source dataset is committed. Training uses a 50,000-row version that adds 45,000 synthetic rows generated from it:

```bash
pip install sdv          # not in requirements.txt — heavier dependency tree
python scripts/expand_dataset.py
```

This writes `dataset/click_fraud_dataset_expanded.csv` (git-ignored, 11 MB). It's **optional**: the processed splits under `dataset/processed/` are committed, so you can skip straight to step 3 and train on the same data. Run the expansion only if you want to regenerate the splits yourself.

### 3. Train the models

The trained model artifacts are not committed (127 MB) — regenerate them once:

```bash
python scripts/preprocess_data.py    # features + encoders + scaler → models/, dataset/processed/
python scripts/train_models.py       # trains Random Forest, XGBoost, neural network
python scripts/train_metalearner.py  # trains the stacking meta-learner
```

`preprocess_data.py` reads the expanded dataset, so run step 2 first if `dataset/click_fraud_dataset_expanded.csv` isn't present. The seven preprocessing artifacts it writes (~5 KB total) *are* committed, so this script is only needed to regenerate them.

> Training on the committed `dataset/processed/` splits reproduces `models/model_metrics.csv` exactly — every metric matches to full float precision.

### 4. Run the API and the dashboard

```bash
# Terminal 1 — Flask API on port 5000
python run.py

# Terminal 2 — Vite dev server on port 3000
cd frontend
npm run dev
```

Open **http://localhost:3000**.

### 5. Verify

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/health/ready
```

`/api/health/ready` reports `200` only once all four models are loaded, so it is the right probe for a deployment.

## API

Thirteen routes, all returning JSON.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/` | Service banner and version |
| `GET` | `/api/docs` | Machine-readable route index |
| `GET` | `/api/health` | Liveness probe |
| `GET` | `/api/health/ready` | Readiness probe — models loaded |
| `POST` | `/api/predict` | Score a single click |
| `POST` | `/api/predict/batch` | Score many clicks (`{"clicks": [...]}`) |
| `POST` | `/api/predict/all-models` | Every model's opinion plus a consensus |
| `GET` | `/api/models` | Loaded models and training metadata |
| `GET` | `/api/models/metrics` | Performance table from `model_metrics.csv` |
| `GET` | `/api/models/features` | Ordered feature list by category |
| `GET` | `/api/models/<model>/importance` | Feature importances or meta coefficients |
| `POST` | `/api/analytics/risk-score` | Weighted 0–100 risk score and factors |
| `GET` | `/api/analytics/dataset/stats` | Train/test split statistics |

### Query parameters

- **`model`** — `random_forest`, `xgboost`, `neural_network`, `meta_learner`, or `ensemble`. Defaults to `meta_learner`.
- **`threshold`** — probability at or above which a click is flagged, `0.0`–`1.0`. Defaults to the value saved during training.

```bash
# Flag more aggressively — 0.3 favours recall over precision
curl -X POST "http://localhost:5000/api/predict?model=meta_learner&threshold=0.3" \
  -H "Content-Type: application/json" -d @click.json
```

### Production behaviour

- **Input validation** — categorical whitelists, numeric range checks, binary flags, timestamp format, and a 1 MiB body limit. Invalid requests get a `422` listing every offending field.
- **Rate limiting** — 60 requests/minute and 1000 requests/day per IP on the prediction blueprint.
- **Structured logging** — one JSON line per request with `request_id`, latency, client IP, model, and outcome.
- **CORS** — enabled for all `/api/*` routes.

## Dashboard

Seven pages, served by React 18 and Vite 5 on a dark slate theme.

| Route | What it does |
|-------|--------------|
| `/` | Service status, model metrics, dataset statistics |
| `/predict` | Single-click form with model picker and threshold slider |
| `/batch` | JSON batch input with summary stats and results table |
| `/models` | Model cards, comparison table, confusion matrix breakdowns |
| `/analytics` | Risk meter, per-model contributions, risk factors |
| `/how-it-works` | Architecture, feature importances, meta-learner coefficients |
| `/ad-demo` | Simulate an impression → click → verdict across fraud scenarios |

## Model performance

Measured on the held-out 10,000-click test split and recorded in `models/model_metrics.csv` (training run of 12 Oct 2026).

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC |
|-------|----------|-----------|--------|-----|---------|
| Random Forest | 0.7711 | 0.545 | **0.479** | **0.510** | 0.7629 |
| XGBoost | 0.7489 | 0.495 | **0.507** | 0.501 | 0.7456 |
| Neural Network | 0.7715 | 0.564 | 0.357 | 0.438 | 0.7644 |
| Meta-Learner | **0.7753** | **0.575** | 0.370 | 0.450 | **0.7663** |

The meta-learner leads on accuracy, precision, and ROC-AUC, which means it ranks clicks more reliably than any single base model. Its F1 sits between the neural network and the tree models — the Random Forest retains the highest F1 in this run, and the meta-learner's F1 is 11.7% below the best base model. For ranking risk across a large click stream, follow the meta-learner; when you want the sharpest per-click decision boundary, the Random Forest with its tuned `0.35` threshold is the stronger pick.

Because the dataset is 3:1 imbalanced, precision and recall trade against each other by design. The `threshold` parameter exists so you can move along that curve per request instead of retraining.

### Model configuration

- **Random Forest** — 200 trees, max depth 20, `class_weight='balanced'`
- **XGBoost** — 200 estimators, max depth 10, `scale_pos_weight` derived from the class balance
- **Neural Network** — `MLPClassifier`, hidden layers 128-64-32
- **Meta-Learner** — logistic regression over 6 meta-features, 5-fold cross-validation

### Input features (17)

- **Categorical (5)** — `device_type`, `browser`, `operating_system`, `ad_position`, `device_ip_reputation`
- **Numerical (10)** — `click_duration`, `scroll_depth`, `mouse_movement`, `keystrokes_detected`, `click_frequency`, `time_since_last_click`, `bot_likelihood_score`, plus `hour`, `day_of_week`, `is_weekend` derived from `timestamp`
- **Binary (2)** — `VPN_usage`, `proxy_usage`

## Python API

Use the inference engine directly, without going through HTTP:

```python
from src.inference import predict, predict_all_models, predict_batch

result = predict(click_data, model_name='meta_learner')
# {'classification': 'FRAUD', 'fraud_probability': 0.59, 'model_used': 'meta_learner', ...}

results = predict_all_models(click_data)     # every model + a majority-vote ensemble
batch = predict_batch(clicks_list)            # list of predictions
```

To control the threshold, construct the detector directly:

```python
from src.inference import FraudDetector

detector = FraudDetector(fraud_threshold=0.3)
result = detector.predict_single(click_data, model_name='meta_learner')
```

## Documentation

- [Preprocessing guide](docs/PREPROCESSING_README.md) — feature engineering, artifact layout, and the reusable pipeline module
- [Final report](Final_Report%20(2).pdf) — project write-up and methodology

### Data pipeline

The dataset is built in four stages. Only the first is committed; the rest is regenerated on demand.

```
dataset/click_fraud_dataset.csv            5,000 rows, real, committed
        |  scripts/expand_dataset.py  (SDV GaussianCopula, seeded)
        v
dataset/click_fraud_dataset_expanded.csv  50,000 rows, git-ignored
        |  scripts/preprocess_data.py
        v
dataset/processed/{train,test}_data.csv   committed, 40k / 10k split
        |  scripts/train_models.py  +  scripts/train_metalearner.py
        v
models/*.joblib                            git-ignored, 127 MB
```

45,000 of the 50,000 training rows are synthetic, generated from a Gaussian copula fitted to the 5,000-row source. Identifier columns (`click_id`, `user_id`) are regenerated for synthetic rows so no synthetic record collides with a real one. The expansion is seeded (`--seed 42`), so a given source produces the same expanded dataset.

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

---

## About the Author

| | |
|:---|:---|
| GitHub | [FarazKIqbal](https://github.com/FarazKIqbal) |
| Repository | [FarazKIqbal/FraudGuard](https://github.com/FarazKIqbal/FraudGuard) |
