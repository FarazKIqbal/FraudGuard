import os
import sys
import logging
import json
import joblib
import pandas as pd
import numpy as np
import pathlib
from typing import Dict, Any, Union
import tensorflow as tf
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add project root to Python path
project_root = pathlib.Path(__file__).parent
sys.path.insert(0, str(project_root))

# Import preprocessing functions
try:
    from data_preprocessing import feature_engineering
except ImportError as e:
    logger.error(f"Could not import preprocessing functions: {e}")
    sys.exit(1)

def load_model():
    """Load the best model (supports Keras and sklearn formats)"""
    try:
        base_dir = pathlib.Path(__file__).parent
        preprocessor_path = base_dir / 'models/preprocessor.pkl'
        
        # Check for different model formats in priority order
        model_paths = [
            base_dir / 'models/fraud_detection_model.keras',
            base_dir / 'models/fraud_detection_model.h5',
            base_dir / 'models/fraud_detection_model.pkl'
        ]
        
        # Find first existing model file
        for model_path in model_paths:
            if model_path.exists():
                actual_model_path = model_path
                break
        else:
            raise FileNotFoundError("No fraud_detection_model found with .keras, .h5 or .pkl extension")
        
        # Load preprocessor
        preprocessor = joblib.load(preprocessor_path)
        if isinstance(preprocessor, dict) and 'preprocessor' in preprocessor:
            preprocessor = preprocessor['preprocessor']
        
        # Load model based on extension
        if actual_model_path.suffix in ['.keras', '.h5']:
            from tensorflow.keras.models import load_model
            model = load_model(actual_model_path)
            model_type = "keras"
        elif actual_model_path.suffix == '.pkl':
            model = joblib.load(actual_model_path)
            model_type = "sklearn"
        else:
            raise ValueError(f"Unsupported model format: {actual_model_path.suffix}")
            
        logger.info(f"Loaded {model_type} model from {actual_model_path}")
        return preprocessor, model, model_type
    
    except Exception as e:
        logger.error(f"Failed to load model: {str(e)}")
        raise

def preprocess_input(data: Dict[str, Any], preprocessor) -> np.ndarray:
    """Process raw input data for prediction"""
    try:
        # Convert to DataFrame
        if isinstance(data, dict):
            df = pd.DataFrame([data])
        else:
            df = pd.DataFrame(data)
        
        # Apply feature engineering
        df = feature_engineering(df)
        logger.info(f"Generated {len(df.columns)} features")
        
        # Transform using preprocessor
        X = preprocessor.transform(df)
        
        # Convert to dense array if sparse
        if hasattr(X, 'toarray'):
            X = X.toarray()
            
        return X
    
    except Exception as e:
        logger.error(f"Error preprocessing input: {e}")
        raise

def predict(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """Make fraud prediction using the best model"""
    try:
        # Load model and preprocessor
        preprocessor, model, model_type = load_model()
        
        # Preprocess input
        X = preprocess_input(input_data, preprocessor)
        
        # Make prediction based on model type
        if model_type == "keras":
            # For Keras models
            prediction = model.predict(X, verbose=0)
            fraud_prob = float(prediction[0][0])
            is_fraud = bool(fraud_prob >= 0.5)
        else:
            # For sklearn models
            if hasattr(model, 'predict_proba'):
                proba = model.predict_proba(X)
                fraud_prob = float(proba[0][1])  # Class 1 probability
                is_fraud = bool(model.predict(X)[0])
            else:
                # Direct prediction
                pred = model.predict(X)
                is_fraud = bool(pred[0])
                fraud_prob = float(pred[0])
        
        # Create log entry
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "input_features": input_data,
            "prediction_result": {
                'is_fraud': is_fraud,
                'fraud_probability': fraud_prob,
                'model_type': model_type
            }
        }

        # Ensure logs directory exists
        log_dir = pathlib.Path(__file__).parent / 'logs'
        log_dir.mkdir(exist_ok=True)
        
        # Append to log file
        log_file = log_dir / 'predictions.log.json'
        with open(log_file, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')

        return {
            'timestamp': datetime.now().isoformat(),
            'input': input_data,
            'prediction': {
                'is_fraud': is_fraud,
                'fraud_probability': fraud_prob,
                'threshold': 0.5
            }
        }
    
    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}")
        return {'error': str(e)}

def main():
    """Run inference on sample data or from command line input"""
    try:
        # Check for command line arguments
        if len(sys.argv) > 1:
            # Try to parse as JSON
            try:
                input_data = json.loads(sys.argv[1])
            except json.JSONDecodeError:
                # Assume it's a file path
                with open(sys.argv[1], 'r') as f:
                    input_data = json.load(f)
        else:
            # Use sample data
            input_data = {
                'timestamp': datetime.now().isoformat(),
                'device_type': 'mobile',
                'browser': 'chrome',
                'operating_system': 'android',
                'ad_position': 'top',
                'device_ip_reputation': 'suspicious',
                'scroll_depth': 75,
                'mouse_movement': 120,
                'keystrokes_detected': 0,
                'click_duration': 0.8,
                'bot_likelihood_score': 0.65,
                'VPN_usage': 1,
                'proxy_usage': 0
            }
        
        # Make prediction
        result = predict(input_data)
        
        # Print results
        print("\nFraud Detection Results:")
        print(json.dumps(result, indent=2))
        
        # Return exit code based on success
        return 0 if 'error' not in result else 1
    
    except Exception as e:
        logger.error(f"Execution failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())