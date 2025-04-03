import logging
import os
import typing
import yaml
import pandas as pd
import numpy as np
import joblib
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.model_selection import train_test_split
import pathlib
from typing import Tuple, Dict, List, Any, Optional

# Load configuration
def load_config(config_path: str = 'config.yaml') -> dict:
    """Load configuration from YAML file with absolute path handling"""
    try:
        # Use absolute path based on file location
        base_dir = pathlib.Path(__file__).parent
        config_file = base_dir / config_path
        
        if config_file.exists():
            with open(config_file, 'r') as file:
                return yaml.safe_load(file)
        else:
            raise FileNotFoundError(f"Config file not found at {config_file}")
            
    except Exception as e:
        logging.error(f"Config loading failed: {str(e)}")
        raise

# Configure logging
config = load_config()
log_dir = pathlib.Path(__file__).parent / 'logs'
log_dir.mkdir(exist_ok=True)
log_file = log_dir / 'data_preprocessing.log'

logging.basicConfig(
    level=getattr(logging, config.get('logging_level', 'INFO')), 
    format='%(asctime)s - %(levelname)s: %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def load_raw_data() -> pd.DataFrame:
    """
    Load augmented dataset from CSV with robust error handling
    
    Returns:
        pd.DataFrame: Loaded dataset
    """
    try:
        # Use pathlib for more robust path handling
        base_dir = pathlib.Path(__file__).parent
        data_path = base_dir / config.get('data_path', 'data/augmented_fraud_dataset.csv')
        
        # Check if file exists
        if not data_path.exists():
            raise FileNotFoundError(f"Dataset not found at {data_path}")
        
        df = pd.read_csv(data_path)
        
        # Validate minimum required columns
        required_columns = [
            'timestamp', 'is_fraudulent', 'device_type', 'browser', 
            'operating_system', 'ad_position', 'device_ip_reputation',
            'scroll_depth', 'mouse_movement', 'keystrokes_detected', 
            'click_duration', 'bot_likelihood_score', 
            'VPN_usage', 'proxy_usage'
        ]
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            logger.warning(f"Missing columns: {missing_columns}")
        
        # Convert timestamp with validation
        df['timestamp'] = pd.to_datetime(
            df['timestamp'],
            format='%Y-%m-%d %H:%M:%S',  # Explicit format
            errors='coerce'  # Convert invalid to NaT
        )
        
        # Remove invalid timestamps
        invalid_timestamps = df['timestamp'].isna().sum()
        if invalid_timestamps > 0:
            logger.warning(f"{invalid_timestamps} invalid timestamps found and removed")
            df = df[df['timestamp'].notna()]
        
        # Data validation
        if df.empty:
            raise ValueError("No valid data found after preprocessing")
        
        return df
    
    except Exception as e:
        logger.error(f"Error loading raw data: {e}")
        raise

def feature_engineering(df):
    """
    Create advanced temporal and behavioral features
    
    Args:
        df (pd.DataFrame): Input dataframe
    
    Returns:
        pd.DataFrame: Dataframe with engineered features
    """
    # Temporal features
    df['hour'] = pd.to_datetime(df['timestamp']).dt.hour.astype(int)
    df['day_of_week'] = pd.to_datetime(df['timestamp']).dt.dayofweek.astype(int)
    df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
    df['month'] = pd.to_datetime(df['timestamp']).dt.month.astype(int)
    
    # Behavioral features
    df['interaction_intensity'] = df['scroll_depth'] * df['mouse_movement'] * df['keystrokes_detected']
    df['dwell_speed'] = df['click_duration'] / (df['mouse_movement'] + 1e-5)
    
    # Fraud risk scoring
    reputation_mapping = {'Good': 0, 'Suspicious': 0.5, 'Bad': 1}
    df['fraud_risk_score'] = (
        0.4 * df['bot_likelihood_score'] +
        0.3 * df['device_ip_reputation'].map(reputation_mapping).fillna(0.5) +
        0.2 * df['VPN_usage'] +
        0.1 * df['proxy_usage']
    )
    
    return df

def preprocess_data(data=None, test_size=0.2, random_state=42):
    """
    Preprocess the input data for model training or inference
    
    Args:
        data (pd.DataFrame, optional): Input data to preprocess. If None, data will be loaded from file.
        test_size (float): Test size for train_test_split. If None, returns processed data without splitting
        random_state (int): Random state for reproducibility
        
    Returns:
        pd.DataFrame or tuple: Preprocessed data or train/test split
    """
    # Load data if not provided
    if data is None:
        data = load_raw_data()
    
    # Process features
    X = data.copy()
    
    # Handle missing values
    for col in X.columns:
        if X[col].dtype == 'object':
            X[col] = X[col].fillna('unknown')
        else:
            X[col] = X[col].fillna(X[col].mean())
    
    # Feature engineering
    X = feature_engineering(X)
    
    # If this is for testing/inference, return processed features only
    if test_size is None:
        return X
        
    # For training, split the data
    y = X.pop('is_fraudulent') if 'is_fraudulent' in X.columns else X.pop('click_validity') if 'click_validity' in X.columns else None
    if y is not None:
        return train_test_split(X, y, test_size=test_size, stratify=y, random_state=random_state)
    return X

# Add at the end of the file after preprocessing logic
def save_preprocessor(preprocessor, path=None):
    """Save preprocessing pipeline to disk"""
    try:
        # Set default path if not provided
        if path is None:
            path = pathlib.Path(__file__).parent / 'models' / 'preprocessor.pkl'
        else:
            path = pathlib.Path(path)
            
        # Create directory if it doesn't exist
        path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save both preprocessor and feature names
        artifacts = {
            'preprocessor': preprocessor,
            'feature_names': list(preprocessor.get_feature_names_out())
        }
        joblib.dump(artifacts, path)
        logging.info(f"Saved preprocessor to {path.resolve()}")
    except Exception as e:
        logging.error(f"Failed to save preprocessor: {str(e)}")
        raise

def create_preprocessing_pipeline():
    """Create the complete preprocessing pipeline"""
    try:
        # Define categorical and numeric features
        categorical_features = ['device_type', 'browser', 'operating_system']
        numeric_features = [
            'hour', 'day_of_week', 'is_weekend', 'month',
            'interaction_intensity', 'dwell_speed', 'fraud_risk_score'
        ]
        
        # Create transformers
        numeric_transformer = StandardScaler()
        categorical_transformer = OneHotEncoder(handle_unknown='ignore')
        
        # Create preprocessing pipeline
        preprocessor = ColumnTransformer(
            transformers=[
                ('num', numeric_transformer, numeric_features),
                ('cat', categorical_transformer, categorical_features)
            ]
        )
        
        return preprocessor
        
    except Exception as e:
        logger.error(f"Error creating preprocessing pipeline: {e}")
        raise

if __name__ == "__main__":
    try:
        logger.info("Starting data preprocessing")
        df = load_raw_data()
        logger.info(f"Loaded data with shape: {df.shape}")
        
        df = feature_engineering(df)
        logger.info("Completed feature engineering")
        
        preprocessor = create_preprocessing_pipeline()
        logger.info("Created preprocessing pipeline")
        
        X_processed = preprocessor.fit_transform(df)
        logger.info(f"Processed data shape: {X_processed.shape}")
        
        save_preprocessor(preprocessor)
        logger.info("Successfully saved preprocessor")
        
    except Exception as e:
        logger.error(f"Critical failure in preprocessing: {str(e)}", exc_info=True)
        raise
