# FraudGuard - Preprocessing Guide

## Overview
This guide explains how to use the preprocessing pipeline for the FraudGuard click fraud detection system.

## Files Generated

### 1. Preprocessing Components (in `models/`)
- **`scaler.joblib`**: StandardScaler for numerical features
- **`label_encoder_*.joblib`**: Label encoders for categorical features (5 files)
  - `label_encoder_device_type.joblib`
  - `label_encoder_browser.joblib`
  - `label_encoder_operating_system.joblib`
  - `label_encoder_ad_position.joblib`
  - `label_encoder_device_ip_reputation.joblib`
- **`feature_metadata.joblib`**: Feature names, types, and preprocessing metadata

### 2. Processed Datasets (in `dataset/processed/`)
- **`train_data.csv`**: Training set (40,000 samples, 80%)
- **`test_data.csv`**: Test set (10,000 samples, 20%)
- **`full_processed_data.csv`**: Complete preprocessed dataset

### 3. Reusable Pipeline
- **`preprocessing_pipeline.py`**: Module for preprocessing new data in production

## Feature Engineering

### Features Used (17 total)
1. **Categorical Features (5)**: device_type, browser, operating_system, ad_position, device_ip_reputation
2. **Numerical Features (10)**:
   - Original: click_duration, scroll_depth, mouse_movement, keystrokes_detected, click_frequency, time_since_last_click, bot_likelihood_score
   - Time-based: hour, day_of_week, is_weekend
3. **Binary Features (2)**: VPN_usage, proxy_usage

### Features Excluded
- Identifiers: click_id, user_id, ip_address
- Temporal: timestamp (converted to hour, day_of_week, is_weekend)
- URLs: referrer_url, page_url

## Usage in Backend

### Basic Usage

```python
from preprocessing_pipeline import preprocess_new_data

# Single click record
new_click = {
    'device_type': 'Mobile',
    'browser': 'Chrome',
    'operating_system': 'Android',
    'ad_position': 'Top',
    'device_ip_reputation': 'Good',
    'click_duration': 1.5,
    'scroll_depth': 45,
    'mouse_movement': 200,
    'keystrokes_detected': 10,
    'click_frequency': 5,
    'time_since_last_click': 120,
    'bot_likelihood_score': 0.3,
    'VPN_usage': 0,
    'proxy_usage': 0,
    'timestamp': '2024-08-23 14:30:00'
}

# Preprocess the data
preprocessed = preprocess_new_data(new_click)
print(preprocessed.shape)  # (1, 17)

# Use with your model
# prediction = model.predict(preprocessed)
```

### Batch Processing

```python
import pandas as pd
from preprocessing_pipeline import preprocess_new_data

# Load multiple click records
new_clicks_df = pd.read_csv('new_clicks.csv')

# Preprocess all at once
preprocessed_batch = preprocess_new_data(new_clicks_df)

# Use with your model
# predictions = model.predict(preprocessed_batch)
```

### Get Feature Names

```python
from preprocessing_pipeline import get_feature_names

feature_names = get_feature_names()
print(feature_names)
# ['device_type', 'browser', 'operating_system', ...]
```

## API Integration Example

```python
from flask import Flask, request, jsonify
from preprocessing_pipeline import preprocess_new_data
import joblib

app = Flask(__name__)

# Load your trained model (when available)
# model = joblib.load('models/fraud_detection_model.joblib')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get click data from request
        click_data = request.json
        
        # Preprocess the data
        preprocessed = preprocess_new_data(click_data)
        
        # Make prediction
        # prediction = model.predict(preprocessed)[0]
        # probability = model.predict_proba(preprocessed)[0][1]
        
        # For now, return preprocessed shape
        return jsonify({
            'status': 'success',
            'preprocessed_shape': preprocessed.shape,
            # 'is_fraudulent': int(prediction),
            # 'fraud_probability': float(probability)
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

if __name__ == '__main__':
    app.run(debug=True)
```

## Re-running Preprocessing

If you need to re-run preprocessing with updated data or different settings:

```bash
python preprocess_data.py
```

This will:
1. Load the dataset
2. Extract and engineer features
3. Encode categorical features
4. Scale numerical features
5. Split into train/test sets
6. Save all preprocessing components as joblib files
7. Create processed CSV files
8. Generate the preprocessing_pipeline.py module

## Dataset Statistics

- **Total Samples**: 50,000
- **Fraudulent Clicks**: 12,435 (24.87%)
- **Legitimate Clicks**: 37,565 (75.13%)
- **Training Set**: 40,000 samples
- **Test Set**: 10,000 samples

## Important Notes

1. **Unseen Categories**: The pipeline handles unseen categorical values by assigning them to the most common class
2. **Feature Order**: Features are automatically arranged in the correct order for model prediction
3. **Timestamp**: If a timestamp is provided, it will be automatically converted to hour, day_of_week, and is_weekend features
4. **Scaling**: Only numerical features are scaled; categorical and binary features are not

## Next Steps

1. Train your fraud detection model using the processed data
2. Save your trained model as `models/fraud_detection_model.joblib`
3. Use the preprocessing pipeline in your backend API
4. Monitor model performance and retrain as needed

## Dependencies

```bash
pip install pandas numpy scikit-learn joblib
```

## Questions?

For issues or questions about the preprocessing pipeline, please refer to the code comments in:
- `preprocess_data.py` - Main preprocessing script
- `preprocessing_pipeline.py` - Reusable backend pipeline
