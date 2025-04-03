import os
import sys
import json
import logging
import typing
import yaml
import numpy as np
import pandas as pd
import joblib
import tensorflow as tf
import warnings
import pathlib
from typing import Dict, List, Tuple, Any, Optional, Union
import shutil
from tensorflow.keras.models import load_model

# Suppress warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
warnings.filterwarnings('ignore', category=UserWarning)

# Add project root to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# Configure logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)

# Import preprocessing functions
try:
    from data_preprocessing import load_raw_data, feature_engineering
except ImportError as e:
    logger.error(f"Could not import preprocessing functions: {e}")
    sys.exit(1)

# Machine Learning imports
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import (
    train_test_split, 
    cross_val_score, 
    StratifiedKFold
)
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    roc_auc_score, f1_score, confusion_matrix,
    classification_report
)
from sklearn.inspection import permutation_importance

# XGBoost imports
from xgboost import XGBClassifier

# Keras imports
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping

# Imbalanced learning imports
from imblearn.pipeline import Pipeline
from imblearn.over_sampling import SMOTE

def load_config(config_path: str = 'config.yaml') -> dict:
    # Replace with a centralized config loader
    # Import from data_preprocessing to avoid duplication
    try:
        from data_preprocessing import load_config as preprocessing_load_config
        return preprocessing_load_config(config_path)
    except ImportError:
        # Fallback implementation if import fails
        try:
            # Use pathlib for more robust path handling
            config_file = pathlib.Path(config_path)
            if config_file.exists():
                with open(config_file, 'r') as file:
                    return yaml.safe_load(file)
            else:
                # Try to find config in the project root
                project_root = pathlib.Path(__file__).parent
                alt_config_path = project_root / 'config.yaml'
                if alt_config_path.exists():
                    with open(alt_config_path, 'r') as file:
                        return yaml.safe_load(file)
                else:
                    logger.warning(f"Config file not found at {config_path}. Using default settings.")
                    return {
                        'test_size': 0.2,
                        'random_state': 42,
                        'smote_ratio': 0.6,
                        'model_types': ['random_forest', 'xgboost', 'neural_network'],
                        'neural_network': {
                            'epochs': 100,
                            'batch_size': 512,
                            'learning_rate': 0.001,
                            'layers': [256, 128, 64],
                            'dropout': 0.3
                        },
                        'random_forest': {
                            'n_estimators': 300,
                            'max_depth': 15,
                            'class_weight': 'balanced'
                        },
                        'xgboost': {
                            'max_depth': 7,
                            'learning_rate': 0.1,
                            'subsample': 0.8,
                            'scale_pos_weight': 2
                        }
                    }
        except yaml.YAMLError as e:
            logger.error(f"Error parsing config file: {e}")
            raise

# Load configuration
CONFIG = load_config()

def load_preprocessed_data() -> typing.Tuple[pd.DataFrame, np.ndarray]:
    """
    Load raw data, apply feature engineering, and prepare features and target.
    
    Returns:
    - X (DataFrame): Feature matrix
    - y (array): Target variable
    """
    try:
        # Load and engineer features
        df = load_raw_data()
        df = feature_engineering(df)
        
        # Check for required columns
        required_columns = [
            'device_type', 'browser', 'operating_system',
            'ad_position', 'device_ip_reputation', 'is_fraudulent'
        ]
        missing = [col for col in required_columns if col not in df.columns]
        
        if missing:
            raise ValueError(f"Missing required columns: {missing}")
        
        # Separate features and target
        X = df.drop('is_fraudulent', axis=1)
        y = df['is_fraudulent'].values
        
        logger.info(f"Loaded data: {X.shape[0]} samples, {X.shape[1]} features")
        return X, y
    
    except Exception as e:
        logger.error(f"Error in data loading and preprocessing: {e}")
        raise

def create_model_pipeline(model_type: str) -> Pipeline:
    """
    Create a unified training pipeline with preprocessing and model.
    
    Args:
    - model_type (str): Type of model to create
    
    Returns:
    - Pipeline: Preprocessing and model training pipeline
    """
    try:
        base_dir = pathlib.Path(__file__).parent
        artifacts_path = base_dir / 'models' / 'preprocessor.pkl'
        
        # Load preprocessor
        if not artifacts_path.exists():
            raise FileNotFoundError(f"Preprocessor not found at {artifacts_path}")
        
        artifacts = joblib.load(artifacts_path)
        preprocessor = artifacts['preprocessor'] if isinstance(artifacts, dict) else artifacts
        
        # Create SMOTE with appropriate parameters
        smote_params = {
            'sampling_strategy': CONFIG.get('smote_ratio', 0.6),
            'random_state': CONFIG.get('random_state', 42),
        }
        
        # Add k_neighbors only if there are enough samples
        if model_type != 'neural_network':
            smote_params['k_neighbors'] = 5
        
        return Pipeline([
            ('preprocessor', preprocessor),
            ('smote', SMOTE(**smote_params)),
            ('classifier', create_model(model_type))
        ])
    
    except Exception as e:
        logger.error(f"Error creating model pipeline: {e}")
        raise

def create_model(model_type: str):
    """
    Model factory with configurable architecture.
    
    Args:
    - model_type (str): Type of model to create
    
    Returns:
    - Model instance
    """
    try:
        if model_type == 'random_forest':
            rf_config = CONFIG.get('random_forest', {})
            return RandomForestClassifier(
                n_estimators=rf_config.get('n_estimators', 300),
                max_depth=rf_config.get('max_depth', 15),
                class_weight=rf_config.get('class_weight', 'balanced'),
                n_jobs=-1,
                random_state=CONFIG.get('random_state', 42)
            )
        
        if model_type == 'xgboost':
            xgb_config = CONFIG.get('xgboost', {})
            return XGBClassifier(
                max_depth=xgb_config.get('max_depth', 7),
                learning_rate=xgb_config.get('learning_rate', 0.1),
                subsample=xgb_config.get('subsample', 0.8),
                scale_pos_weight=xgb_config.get('scale_pos_weight', 2),
                eval_metric='auc',
                use_label_encoder=False,
                random_state=CONFIG.get('random_state', 42)
            )
        
        if model_type == 'neural_network':
            nn_config = CONFIG.get('neural_network', {})
            model = Sequential()
            
            # Dynamically add layers
            layer_units = nn_config.get('layers', [256, 128, 64])
            dropout_rate = nn_config.get('dropout', 0.3)
            
            for units in layer_units:
                model.add(Dense(units, activation='relu'))
                model.add(BatchNormalization())
                model.add(Dropout(dropout_rate))
            
            model.add(Dense(1, activation='sigmoid'))
            
            model.compile(
                optimizer=Adam(learning_rate=nn_config.get('learning_rate', 0.001)),
                loss='binary_crossentropy',
                metrics=['accuracy', tf.keras.metrics.AUC(name='auc')]
            )
            return model
        
        raise ValueError(f"Invalid model type: {model_type}")
    
    except Exception as e:
        logger.error(f"Error creating model: {e}")
        raise

def perform_model_interpretation(model, X_test, y_test, model_type: str, output_dir: str) -> None:
    """
    Perform model interpretation and save results
    
    Args:
        model: Trained model
        X_test: Test features
        y_test: Test labels
        model_type: Type of model
        output_dir: Directory to save interpretation results
    """
    try:
        # Interpretability for scikit-learn models
        if model_type in ['random_forest', 'xgboost']:
            # For pipeline models, we need to access the classifier
            if hasattr(model, 'steps') and model_type in ['random_forest', 'xgboost']:
                classifier = model.named_steps['classifier']
            else:
                classifier = model
                
            # Get feature names from preprocessor if available
            try:
                preprocessor = model.named_steps['preprocessor']
                feature_names = preprocessor.get_feature_names_out()
            except (AttributeError, KeyError):
                # If feature names not available, use generic names
                feature_names = [f'feature_{i}' for i in range(X_test.shape[1])]
            
            # Permutation importance
            perm_importance = permutation_importance(
                model, X_test, y_test, 
                n_repeats=10, 
                random_state=CONFIG.get('random_state', 42)
            )
            
            # Save permutation importance
            importance_df = pd.DataFrame({
                'feature': feature_names[:len(perm_importance.importances_mean)],
                'importance': perm_importance.importances_mean,
                'std': perm_importance.importances_std
            }).sort_values('importance', ascending=False)
            
            # Use pathlib for path handling
            output_path = pathlib.Path(output_dir) / f'{model_type}_feature_importance.csv'
            importance_df.to_csv(output_path, index=False)
            logger.info(f"Feature importance for {model_type} saved to {output_path}")
            
            # Add visualization of feature importance
            if len(importance_df) > 0:
                try:
                    import matplotlib.pyplot as plt
                    plt.figure(figsize=(10, 8))
                    plt.barh(importance_df['feature'][:15], importance_df['importance'][:15])
                    plt.xlabel('Importance')
                    plt.ylabel('Feature')
                    plt.title(f'Top 15 Feature Importance - {model_type.capitalize()}')
                    plt.tight_layout()
                    plt.savefig(pathlib.Path(output_dir) / f'{model_type}_feature_importance.png')
                    plt.close()
                except Exception as viz_error:
                    logger.warning(f"Could not create visualization: {viz_error}")
    
    except Exception as e:
        logger.warning(f"Model interpretation failed for {model_type}: {e}")

def train_and_evaluate() -> Dict[str, Any]:
    """
    Main training workflow for fraud detection models.
    """
    try:
        # Load and prepare data
        X, y = load_preprocessed_data()
        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=CONFIG.get('test_size', 0.2),
            stratify=y,
            random_state=CONFIG.get('random_state', 42)
        )
        
        results = {}
        model_types = CONFIG.get('model_types', ['random_forest', 'xgboost', 'neural_network'])
        
        for model_type in model_types:
            logger.info(f"\n=== Training {model_type.upper()} ===")
            
            try:
                # Create model pipeline
                pipeline = create_model_pipeline(model_type)
                
                # Cross-validation before final training
                cv = StratifiedKFold(
                    n_splits=5, 
                    shuffle=True, 
                    random_state=CONFIG.get('random_state', 42)
                )
                
                # Perform cross-validation
                if model_type != 'neural_network':
                    cv_scores = cross_val_score(
                        pipeline, X_train, y_train, 
                        cv=cv, scoring='roc_auc'
                    )
                    logger.info(f"Cross-validation AUC: {cv_scores.mean():.4f} ± {cv_scores.std() * 2:.4f}")
                
                # Training logic with model-specific handling
                if model_type == 'neural_network':
                    # Fix neural network training
                    nn_config = CONFIG.get('neural_network', {})
                    early_stop = EarlyStopping(
                        monitor='val_auc',
                        patience=10,
                        restore_best_weights=True
                    )
                    
                    # Preprocess data for neural network
                    X_preprocessed = pipeline['preprocessor'].transform(X_train)
                    
                    # Check if X_preprocessed is a numpy array
                    if not isinstance(X_preprocessed, np.ndarray):
                        X_preprocessed = X_preprocessed.toarray()
                    
                    X_res, y_res = pipeline['smote'].fit_resample(X_preprocessed, y_train)
                    
                    # Neural network training
                    model = pipeline['classifier']
                    history = model.fit(
                        X_res, y_res,
                        epochs=nn_config.get('epochs', 100),
                        batch_size=nn_config.get('batch_size', 512),
                        validation_split=0.2,
                        callbacks=[early_stop],
                        verbose=1
                    )
                    
                    # Save training history
                    history_df = pd.DataFrame(history.history)
                    model_dir = pathlib.Path(__file__).parent / 'models' / f"{model_type}_model"
                    model_dir.mkdir(exist_ok=True, parents=True)
                    history_df.to_csv(model_dir / 'training_history.csv', index=False)
                    
                else:
                    # Classical ML model training
                    pipeline.fit(X_train, y_train)
                
                # Prediction and evaluation
                if model_type == 'neural_network':
                    # Preprocess test data
                    X_test_preprocessed = pipeline['preprocessor'].transform(X_test)
                    if not isinstance(X_test_preprocessed, np.ndarray):
                        X_test_preprocessed = X_test_preprocessed.toarray()
                    
                    # Get predictions
                    y_pred_proba = pipeline['classifier'].predict(X_test_preprocessed)
                    y_pred = (y_pred_proba > 0.5).astype(int).flatten()
                else:
                    y_pred = pipeline.predict(X_test)
                
                # Compute performance metrics
                results[model_type] = {
                    'accuracy': accuracy_score(y_test, y_pred),
                    'precision': precision_score(y_test, y_pred),
                    'recall': recall_score(y_test, y_pred),
                    'roc_auc': roc_auc_score(y_test, y_pred),
                    'f1': f1_score(y_test, y_pred),
                    'confusion_matrix': confusion_matrix(y_test, y_pred).tolist(),
                    'classification_report': classification_report(y_test, y_pred, output_dict=True)
                }
                
                # Define the base directory for saving models using pathlib
                base_model_dir = pathlib.Path(__file__).parent / 'models'
                base_model_dir.mkdir(exist_ok=True)
                
                model_dir = base_model_dir / f"{model_type}_model"
                model_dir.mkdir(exist_ok=True)

                # Save the model
                # In the model saving block:
                if model_type == 'neural_network':
                    # Save the trained model properly
                    model_path = model_dir / 'model.h5'
                    model.save(model_path)  # Add error handling for this line
                    logger.info(f"Saved neural network model to {model_path.resolve()}")

                else:
                    joblib.dump(pipeline, model_dir / 'model.pkl')

                # Perform model interpretation
                perform_model_interpretation(
                    pipeline['classifier'] if model_type != 'neural_network' else pipeline, 
                    X_test, 
                    y_test, 
                    model_type, 
                    model_dir
                )

                logger.info(f"{model_type.upper()} saved to {model_dir}")

                # Save evaluation results
                results_path = os.path.join(base_model_dir, "training_results.json")
                with open(results_path, 'w') as f:
                    json.dump(results, f, indent=2)

                logger.info(f"Training results saved to {results_path}")
                
            except Exception as model_error:
                logger.error(f"{model_type.upper()} training failed: {model_error}")
                continue

        return results

    except Exception as e:
        logger.error(f"Critical training error: {str(e)}")
        raise

def main():
    """Main execution function"""
    try:
        # Ensure models directory exists
        models_dir = pathlib.Path(__file__).parent / 'models'
        models_dir.mkdir(exist_ok=True)
        
        # Train and evaluate models
        results = train_and_evaluate()
        
        # Track best model across all types
        best_accuracy = 0
        best_model_info = {}
        
        # Analyze results to find best model
        for model_name, metrics in results.items():
            if 'error' not in metrics and metrics.get('accuracy', 0) > best_accuracy:
                best_accuracy = metrics['accuracy']
                best_model_info = {
                    'type': model_name,
                    'path': models_dir / f"{model_name}_model/model.{'h5' if model_name == 'neural_network' else 'pkl'}"
                }
        
        # Save best model separately
        # In the best model saving section:
        if best_model_info:
            best_model_path = models_dir / 'fraud_detection_model.keras'  # Changed extension
            
            if best_model_info['type'] == 'neural_network':
                # Use native Keras format
                best_model = load_model(best_model_info['path'])
                best_model.save(best_model_path)  # Save as .keras format
            else:
                # For sklearn models, keep .pkl but use correct path
                best_model_path = models_dir / 'fraud_detection_model.pkl'
                shutil.copy(best_model_info['path'], best_model_path)
            
            logger.info(f"Best model ({best_model_info['type']}) saved to {best_model_path}")
        
        # Print results
        print("\nFinal Results:")
        print(json.dumps(results, indent=2))
    
    except Exception as e:
        logger.error(f"Execution failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

