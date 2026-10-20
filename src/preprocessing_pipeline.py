
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
    print("\nPreprocessed data:")
    print(preprocessed)
    
    print("\nFeature names:")
    print(get_feature_names())
