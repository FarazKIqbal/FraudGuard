"""
FraudGuard - Data Preprocessing Script
This script preprocesses the click fraud dataset and saves all preprocessing components
as joblib files for easy reuse in production/backend.
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import os
from datetime import datetime

# Configuration
DATASET_PATH = 'dataset/click_fraud_dataset_expanded.csv'
MODELS_DIR = 'models'
PROCESSED_DATA_DIR = 'dataset/processed'

# Create necessary directories
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)

print("=" * 60)
print("FraudGuard - Data Preprocessing Pipeline")
print("=" * 60)

# Load dataset
print("\n[1/7] Loading dataset...")
df = pd.read_csv(DATASET_PATH)
print(f"Dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")

# Display basic info
print("\n[2/7] Dataset Overview:")
print(f"Total samples: {len(df)}")
print(f"Fraudulent clicks: {df['is_fraudulent'].sum()} ({df['is_fraudulent'].mean()*100:.2f}%)")
print(f"Legitimate clicks: {(1-df['is_fraudulent']).sum()} ({(1-df['is_fraudulent'].mean())*100:.2f}%)")

# Check for missing values
print("\n[3/7] Checking for missing values...")
missing_values = df.isnull().sum()
if missing_values.sum() > 0:
    print("Missing values found:")
    print(missing_values[missing_values > 0])
else:
    print("No missing values found!")

# Define feature groups
# Features to drop (IDs and non-predictive features)
features_to_drop = ['click_id', 'timestamp', 'user_id', 'ip_address', 'referrer_url', 'page_url']

# Categorical features
categorical_features = ['device_type', 'browser', 'operating_system', 'ad_position', 'device_ip_reputation']

# Numerical features
numerical_features = [
    'click_duration', 'scroll_depth', 'mouse_movement', 'keystrokes_detected',
    'click_frequency', 'time_since_last_click', 'bot_likelihood_score'
]

# Binary features (already encoded as 0/1)
binary_features = ['VPN_usage', 'proxy_usage']

# Target variable
target = 'is_fraudulent'

print(f"\n[4/7] Feature Engineering:")
print(f"  - Categorical features: {len(categorical_features)}")
print(f"  - Numerical features: {len(numerical_features)}")
print(f"  - Binary features: {len(binary_features)}")
print(f"  - Features to drop: {len(features_to_drop)}")

# Create a copy for preprocessing
df_processed = df.copy()

# Extract additional time-based features from timestamp
print("\n[5/7] Extracting time-based features...")
df_processed['timestamp'] = pd.to_datetime(df_processed['timestamp'])
df_processed['hour'] = df_processed['timestamp'].dt.hour
df_processed['day_of_week'] = df_processed['timestamp'].dt.dayofweek
df_processed['is_weekend'] = (df_processed['timestamp'].dt.dayofweek >= 5).astype(int)

# Add these to numerical features
additional_numerical_features = ['hour', 'day_of_week', 'is_weekend']
numerical_features.extend(additional_numerical_features)

# Encode categorical features
print("\n[6/7] Encoding categorical features...")
label_encoders = {}

for feature in categorical_features:
    le = LabelEncoder()
    df_processed[feature] = le.fit_transform(df_processed[feature].astype(str))
    label_encoders[feature] = le
    print(f"  - {feature}: {len(le.classes_)} unique values")

# Save label encoders
for feature, encoder in label_encoders.items():
    joblib.dump(encoder, os.path.join(MODELS_DIR, f'label_encoder_{feature}.joblib'))
print(f"\nSaved {len(label_encoders)} label encoders to {MODELS_DIR}/")

# Prepare features and target
X = df_processed[categorical_features + numerical_features + binary_features]
y = df_processed[target]

# Scale numerical features
print("\n[7/7] Scaling numerical features...")
scaler = StandardScaler()
X_scaled = X.copy()
X_scaled[numerical_features] = scaler.fit_transform(X[numerical_features])

print(f"  - Scaled {len(numerical_features)} numerical features")

# Save the scaler
scaler_path = os.path.join(MODELS_DIR, 'scaler.joblib')
joblib.dump(scaler, scaler_path)
print(f"Saved scaler to {scaler_path}")

# Save feature column names and metadata
feature_metadata = {
    'categorical_features': categorical_features,
    'numerical_features': numerical_features,
    'binary_features': binary_features,
    'all_features': list(X.columns),
    'target': target,
    'feature_order': list(X_scaled.columns),
    'preprocessing_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
}

metadata_path = os.path.join(MODELS_DIR, 'feature_metadata.joblib')
joblib.dump(feature_metadata, metadata_path)
print(f"Saved feature metadata to {metadata_path}")

# Split data into train and test sets
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42, stratify=y
)

print("\n" + "=" * 60)
print("Train/Test Split:")
print("=" * 60)
print(f"Training set: {X_train.shape[0]} samples")
print(f"Test set: {X_test.shape[0]} samples")
print(f"Training set fraud rate: {y_train.mean()*100:.2f}%")
print(f"Test set fraud rate: {y_test.mean()*100:.2f}%")

# Save processed datasets
train_data = pd.concat([X_train, y_train], axis=1)
test_data = pd.concat([X_test, y_test], axis=1)

train_path = os.path.join(PROCESSED_DATA_DIR, 'train_data.csv')
test_path = os.path.join(PROCESSED_DATA_DIR, 'test_data.csv')

train_data.to_csv(train_path, index=False)
test_data.to_csv(test_path, index=False)

print(f"\nSaved training data to {train_path}")
print(f"Saved test data to {test_path}")

# Save the full processed dataset as well
full_processed_path = os.path.join(PROCESSED_DATA_DIR, 'full_processed_data.csv')
full_processed = pd.concat([X_scaled, y], axis=1)
full_processed.to_csv(full_processed_path, index=False)
print(f"Saved full processed data to {full_processed_path}")

# Create a preprocessing pipeline function for backend use
preprocessing_pipeline_code = '''
"""
FraudGuard - Backend Preprocessing Pipeline
This module provides a reusable preprocessing function for new data.
"""

import pandas as pd
import joblib
import os

def preprocess_new_data(data, models_dir='models'):
    """
    Preprocess new click data using saved preprocessing components.
    
    Parameters:
    -----------
    data : pd.DataFrame or dict
        New click data to preprocess. Can be a single record (dict) or multiple records (DataFrame)
    models_dir : str
        Path to directory containing saved preprocessing components
        
    Returns:
    --------
    pd.DataFrame
        Preprocessed data ready for model prediction
    """
    # Convert dict to DataFrame if needed
    if isinstance(data, dict):
        data = pd.DataFrame([data])
    elif not isinstance(data, pd.DataFrame):
        data = pd.DataFrame(data)
    
    # Make a copy to avoid modifying original data
    df = data.copy()
    
    # Load feature metadata
    metadata = joblib.load(os.path.join(models_dir, 'feature_metadata.joblib'))
    categorical_features = metadata['categorical_features']
    numerical_features = metadata['numerical_features']
    binary_features = metadata['binary_features']
    
    # Extract time-based features if timestamp is present
    if 'timestamp' in df.columns:
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df['hour'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        df['is_weekend'] = (df['timestamp'].dt.dayofweek >= 5).astype(int)
    
    # Load and apply label encoders
    for feature in categorical_features:
        encoder_path = os.path.join(models_dir, f'label_encoder_{feature}.joblib')
        encoder = joblib.load(encoder_path)
        
        # Handle unseen categories
        df[feature] = df[feature].astype(str)
        unseen_mask = ~df[feature].isin(encoder.classes_)
        if unseen_mask.any():
            # Assign unseen categories to the most common class
            df.loc[unseen_mask, feature] = encoder.classes_[0]
        
        df[feature] = encoder.transform(df[feature])
    
    # Load and apply scaler
    scaler = joblib.load(os.path.join(models_dir, 'scaler.joblib'))
    
    # Prepare features in the correct order
    X = df[categorical_features + numerical_features + binary_features]
    
    # Scale numerical features
    X_scaled = X.copy()
    X_scaled[numerical_features] = scaler.transform(X[numerical_features])
    
    # Ensure columns are in the correct order
    X_scaled = X_scaled[metadata['feature_order']]
    
    return X_scaled


def get_feature_names(models_dir='models'):
    """
    Get the list of feature names in the correct order.
    
    Parameters:
    -----------
    models_dir : str
        Path to directory containing saved preprocessing components
        
    Returns:
    --------
    list
        List of feature names in the correct order
    """
    metadata = joblib.load(os.path.join(models_dir, 'feature_metadata.joblib'))
    return metadata['feature_order']


if __name__ == '__main__':
    # Example usage
    sample_data = {
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
    
    preprocessed = preprocess_new_data(sample_data)
    print("Preprocessed data shape:", preprocessed.shape)
    print("\\nPreprocessed data:")
    print(preprocessed)
    
    print("\\nFeature names:")
    print(get_feature_names())
'''

# Save the preprocessing pipeline module
pipeline_path = 'src/preprocessing_pipeline.py'
with open(pipeline_path, 'w') as f:
    f.write(preprocessing_pipeline_code)

print(f"\nCreated preprocessing pipeline module: {pipeline_path}")

# Summary
print("\n" + "=" * 60)
print("PREPROCESSING COMPLETE!")
print("=" * 60)
print("\nSaved Components:")
print(f"  1. Label Encoders: {len(label_encoders)} files in {MODELS_DIR}/")
print(f"  2. Scaler: {scaler_path}")
print(f"  3. Feature Metadata: {metadata_path}")
print(f"  4. Training Data: {train_path}")
print(f"  5. Test Data: {test_path}")
print(f"  6. Full Processed Data: {full_processed_path}")
print(f"  7. Preprocessing Pipeline: {pipeline_path}")

print("\n" + "=" * 60)
print("Usage in Backend:")
print("=" * 60)
print("""
from preprocessing_pipeline import preprocess_new_data

# For a single click
new_click = {
    'device_type': 'Mobile',
    'browser': 'Chrome',
    'operating_system': 'Android',
    # ... other features
}
preprocessed_data = preprocess_new_data(new_click)

# For multiple clicks
import pandas as pd
new_clicks_df = pd.read_csv('new_clicks.csv')
preprocessed_data = preprocess_new_data(new_clicks_df)
""")
print("=" * 60)
