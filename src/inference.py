"""
FraudGuard - ML Inference Module
Provides fraud detection predictions using trained models:
- Random Forest
- XGBoost
- Neural Network

Returns classification and confidence scores.
"""

import pandas as pd
import numpy as np
import joblib
import os
from src.preprocessing_pipeline import preprocess_new_data
import warnings
warnings.filterwarnings('ignore')

# Configuration
MODELS_DIR = 'models'

# Default decision threshold.  0.5 is the model's natural cut-off, but for
# an imbalanced fraud dataset a lower threshold trades a few false positives
# for many more true positives — the standard fraud-detection trade-off.
# Best thresholds are loaded from best_thresholds.joblib if present.
DEFAULT_FRAUD_THRESHOLD = 0.5


class FraudDetector:
    """
    Fraud detection inference engine supporting multiple ML models.
    """

    def __init__(self, models_dir=MODELS_DIR, fraud_threshold=None):
        """
        Initialize the fraud detector by loading trained models.

        Parameters
        ----------
        models_dir : str
            Directory containing trained models and preprocessing components
        fraud_threshold : float, optional
            Probability above which a click is flagged as fraud.  Defaults to
            the best threshold saved during training (or 0.5).
        """
        self.models_dir = models_dir
        self.models = {}
        self.model_metadata = None
        self.meta_learner = None
        self.meta_learner_metadata = None
        self.fraud_threshold = self._resolve_threshold(fraud_threshold)

        # Load models
        self._load_models()

    def _resolve_threshold(self, fraud_threshold):
        """Pick the best threshold from training, falling back to 0.5."""
        if fraud_threshold is not None:
            return float(fraud_threshold)
        path = os.path.join(self.models_dir, 'best_thresholds.joblib')
        if os.path.exists(path):
            try:
                best = joblib.load(path)
                # Use the meta-learner's best threshold if available, else RF.
                for key in ('meta_learner', 'random_forest', 'neural_network',
                            'xgboost'):
                    if key in best:
                        return float(best[key]['threshold'])
            except Exception:
                pass
        return DEFAULT_FRAUD_THRESHOLD
        
    def _load_models(self):
        """Load all available trained models"""
        print("Loading fraud detection models...")
        
        # Try to load Random Forest
        rf_path = os.path.join(self.models_dir, 'random_forest_model.joblib')
        if os.path.exists(rf_path):
            self.models['random_forest'] = joblib.load(rf_path)
            print("  [+] Random Forest loaded")
        
        # Try to load XGBoost
        xgb_path = os.path.join(self.models_dir, 'xgboost_model.joblib')
        if os.path.exists(xgb_path):
            self.models['xgboost'] = joblib.load(xgb_path)
            print("  [+] XGBoost loaded")
        
        # Try to load Neural Network
        nn_path = os.path.join(self.models_dir, 'neural_network_model.joblib')
        if os.path.exists(nn_path):
            self.models['neural_network'] = joblib.load(nn_path)
            print("  [+] Neural Network loaded")
        
        # Load model metadata
        metadata_path = os.path.join(self.models_dir, 'model_metadata.joblib')
        if os.path.exists(metadata_path):
            self.model_metadata = joblib.load(metadata_path)
        
        # Try to load Meta-Learner
        meta_path = os.path.join(self.models_dir, 'meta_learner_model.joblib')
        if os.path.exists(meta_path):
            self.meta_learner = joblib.load(meta_path)
            print("  [+] Meta-Learner loaded")
            
            # Load meta-learner metadata
            meta_metadata_path = os.path.join(self.models_dir, 'meta_learner_metadata.joblib')
            if os.path.exists(meta_metadata_path):
                self.meta_learner_metadata = joblib.load(meta_metadata_path)
        
        if not self.models:
            raise RuntimeError("No trained models found! Please run train_models.py first.")
        
        print(f"\nLoaded {len(self.models)} base model(s): {', '.join(self.models.keys())}")
        if self.meta_learner:
            print("Meta-learner is available for enhanced predictions")
    
    def predict_single(self, click_data, model_name='random_forest', return_all_models=False,
                   fraud_threshold=None):
        """
        Predict if a single click is fraudulent.

        Parameters
        ----------
        click_data : dict
            Dictionary containing click features
        model_name : str
            Name of model to use ('random_forest', 'xgboost', 'neural_network',
            'meta_learner', 'ensemble')
        return_all_models : bool
            If True, return predictions from all models
        fraud_threshold : float, optional
            Probability above which a click is flagged as fraud.  Defaults to
            the best threshold saved during training (or 0.5).

        Returns
        -------
        dict
            Prediction results with classification and confidence score
        """
        # Preprocess the data
        preprocessed = preprocess_new_data(click_data, self.models_dir)

        if return_all_models:
            return self._predict_all_models(preprocessed, fraud_threshold=fraud_threshold)
        elif model_name == 'meta_learner':
            return self._predict_with_meta_learner(preprocessed, fraud_threshold=fraud_threshold)
        else:
            return self._predict_with_model(preprocessed, model_name, fraud_threshold=fraud_threshold)

    def predict_batch(self, click_data_list, model_name='random_forest', fraud_threshold=None):
        """
        Predict fraud for multiple clicks.

        Parameters
        ----------
        click_data_list : list or pd.DataFrame
            List of dictionaries or DataFrame containing click features
        model_name : str
            Name of model to use
        fraud_threshold : float, optional
            Probability above which a click is flagged as fraud.

        Returns
        -------
        list
            List of prediction dictionaries
        """
        # Convert to DataFrame if needed
        if isinstance(click_data_list, list):
            df = pd.DataFrame(click_data_list)
        else:
            df = click_data_list

        # Preprocess all data at once
        preprocessed = preprocess_new_data(df, self.models_dir)

        # Get predictions
        results = []
        for i in range(len(preprocessed)):
            row = preprocessed.iloc[i:i+1]
            if model_name == 'meta_learner':
                result = self._predict_with_meta_learner(row, fraud_threshold=fraud_threshold)
            else:
                result = self._predict_with_model(row, model_name, fraud_threshold=fraud_threshold)
            results.append(result)

        return results
    
    def _predict_with_model(self, preprocessed_data, model_name, fraud_threshold=None):
        """Make prediction with a specific model"""
        if model_name not in self.models:
            raise ValueError(f"Model '{model_name}' not available. Available: {list(self.models.keys())}")

        model = self.models[model_name]

        # Convert DataFrame to numpy array to avoid feature name validation issues
        # This is necessary because models may have been trained with different sklearn versions
        X = preprocessed_data.values if hasattr(preprocessed_data, 'values') else preprocessed_data

        # Get prediction and probability
        prediction = model.predict(X)[0]
        probabilities = model.predict_proba(X)[0]
        fraud_probability = float(probabilities[1])

        # Decision rule: flag as fraud when the fraud probability exceeds the
        # configured threshold.  The default 0.5 matches the model's natural
        # cut-off; a lower threshold trades false positives for true positives.
        threshold = fraud_threshold if fraud_threshold is not None else self.fraud_threshold
        is_fraudulent = fraud_probability >= threshold

        # Confidence is the probability of the predicted class
        confidence = fraud_probability if is_fraudulent else float(probabilities[0])

        return {
            'is_fraudulent': bool(is_fraudulent),
            'classification': 'FRAUD' if is_fraudulent else 'LEGITIMATE',
            'confidence_score': float(confidence),
            'fraud_probability': fraud_probability,
            'legitimate_probability': float(probabilities[0]),
            'model_used': model_name,
            'fraud_threshold': threshold,
        }
    
    def _predict_all_models(self, preprocessed_data, fraud_threshold=None):
        """Get predictions from all available models"""
        results = {}

        for model_name in self.models.keys():
            results[model_name] = self._predict_with_model(preprocessed_data, model_name,
                                                            fraud_threshold=fraud_threshold)

        # Add meta-learner prediction if available
        if self.meta_learner:
            results['meta_learner'] = self._predict_with_meta_learner(preprocessed_data,
                                                                       fraud_threshold=fraud_threshold)

        # Add ensemble prediction (majority voting)
        if len(self.models) > 1:
            predictions = [r['is_fraudulent'] for r in results.values() if r['model_used'] != 'meta_learner']
            fraud_probabilities = [r['fraud_probability'] for r in results.values() if r['model_used'] != 'meta_learner']

            # Majority vote
            fraud_votes = sum(predictions)
            ensemble_prediction = fraud_votes > len(predictions) / 2

            # Average probability
            avg_fraud_prob = np.mean(fraud_probabilities)

            results['ensemble'] = {
                'is_fraudulent': bool(ensemble_prediction),
                'classification': 'FRAUD' if ensemble_prediction else 'LEGITIMATE',
                'confidence_score': float(max(avg_fraud_prob, 1 - avg_fraud_prob)),
                'fraud_probability': float(avg_fraud_prob),
                'legitimate_probability': float(1 - avg_fraud_prob),
                'model_used': 'ensemble',
                'votes': {'fraud': int(fraud_votes), 'legitimate': int(len(predictions) - fraud_votes)},
                'fraud_threshold': fraud_threshold if fraud_threshold is not None else self.fraud_threshold,
            }

        return results
    
    def _generate_meta_features(self, preprocessed_data):
        """Generate meta-features from base model predictions"""
        if not self.meta_learner_metadata:
            raise RuntimeError("Meta-learner metadata not found")
        
        base_models_needed = self.meta_learner_metadata['base_models']
        num_samples = len(preprocessed_data)
        meta_features = np.zeros((num_samples, len(base_models_needed) * 2))
        
        # Convert to numpy array to avoid feature name validation issues
        X = preprocessed_data.values if hasattr(preprocessed_data, 'values') else preprocessed_data
        
        for i, model_name in enumerate(base_models_needed):
            if model_name not in self.models:
                raise RuntimeError(f"Base model '{model_name}' required by meta-learner not found")
            
            model = self.models[model_name]
            preds = model.predict(X)
            proba = model.predict_proba(X)[:, 1]
            
            meta_features[:, i*2] = preds
            meta_features[:, i*2 + 1] = proba
        
        return meta_features
    
    def _predict_with_meta_learner(self, preprocessed_data, fraud_threshold=None):
        """Make prediction using the meta-learner"""
        if not self.meta_learner:
            raise RuntimeError("Meta-learner not available. Train it with train_metalearner.py")

        # Generate meta-features from base model predictions
        meta_features = self._generate_meta_features(preprocessed_data)

        # Get meta-learner prediction
        prediction = self.meta_learner.predict(meta_features)[0]
        probabilities = self.meta_learner.predict_proba(meta_features)[0]
        fraud_probability = float(probabilities[1])

        # Apply the same configurable threshold as the base models.
        threshold = fraud_threshold if fraud_threshold is not None else self.fraud_threshold
        is_fraudulent = fraud_probability >= threshold

        confidence = fraud_probability if is_fraudulent else float(probabilities[0])

        # Also include base model predictions for transparency
        base_predictions = {}
        base_models = self.meta_learner_metadata['base_models']
        for i, model_name in enumerate(base_models):
            base_predictions[model_name] = {
                'prediction': int(meta_features[0, i*2]),
                'fraud_probability': float(meta_features[0, i*2 + 1])
            }

        return {
            'is_fraudulent': bool(is_fraudulent),
            'classification': 'FRAUD' if is_fraudulent else 'LEGITIMATE',
            'confidence_score': float(confidence),
            'fraud_probability': fraud_probability,
            'legitimate_probability': float(probabilities[0]),
            'model_used': 'meta_learner',
            'fraud_threshold': threshold,
            'meta_learner_type': self.meta_learner_metadata.get('meta_learner_type', 'unknown'),
            'base_model_predictions': base_predictions
        }
    
    def get_model_info(self):
        """Get information about loaded models"""
        available = list(self.models.keys())
        if self.meta_learner:
            available.append('meta_learner')

        info = {
            'available_models': available,
            'num_models': len(available),
            'models_dir': self.models_dir,
            'meta_learner_available': self.meta_learner is not None
        }
        
        if self.model_metadata:
            info.update({
                'training_date': self.model_metadata.get('training_date'),
                'best_model_by_f1': self.model_metadata.get('best_model_by_f1'),
                'best_model_by_roc_auc': self.model_metadata.get('best_model_by_roc_auc'),
                'num_features': self.model_metadata.get('num_features')
            })
        
        if self.meta_learner_metadata:
            info['meta_learner_info'] = {
                'type': self.meta_learner_metadata.get('meta_learner_type'),
                'base_models': self.meta_learner_metadata.get('base_models'),
                'training_date': self.meta_learner_metadata.get('training_date'),
                'metrics': self.meta_learner_metadata.get('metrics'),
                'improvement': self.meta_learner_metadata.get('improvement_over_best_base')
            }
        
        return info


# Convenience functions for direct use
_detector = None


def get_detector():
    """Get or create the global fraud detector instance"""
    global _detector
    if _detector is None:
        _detector = FraudDetector()
    return _detector


def predict(click_data, model_name='random_forest'):
    """
    Convenience function to predict fraud for a single click.
    
    Parameters:
    -----------
    click_data : dict
        Dictionary containing click features
    model_name : str
        Model to use for prediction
    
    Returns:
    --------
    dict
        Prediction results
    """
    detector = get_detector()
    return detector.predict_single(click_data, model_name)


def predict_all_models(click_data):
    """
    Get predictions from all available models.
    
    Parameters:
    -----------
    click_data : dict
        Dictionary containing click features
    
    Returns:
    --------
    dict
        Predictions from all models
    """
    detector = get_detector()
    return detector.predict_single(click_data, return_all_models=True)


def predict_batch(click_data_list, model_name='random_forest'):
    """
    Predict fraud for multiple clicks.
    
    Parameters:
    -----------
    click_data_list : list or pd.DataFrame
        Multiple click records
    model_name : str
        Model to use
    
    Returns:
    --------
    list
        List of predictions
    """
    detector = get_detector()
    return detector.predict_batch(click_data_list, model_name)


# Main execution for testing
if __name__ == '__main__':
    print("=" * 70)
    print("FraudGuard - ML Inference Test")
    print("=" * 70)
    
    # Example click data
    sample_clicks = [
        {
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
        },
        {
            'device_type': 'Desktop',
            'browser': 'Firefox',
            'operating_system': 'Windows',
            'ad_position': 'Bottom',
            'device_ip_reputation': 'Suspicious',
            'click_duration': 0.1,
            'scroll_depth': 5,
            'mouse_movement': 10,
            'keystrokes_detected': 0,
            'click_frequency': 15,
            'time_since_last_click': 5,
            'bot_likelihood_score': 0.95,
            'VPN_usage': 1,
            'proxy_usage': 1,
            'timestamp': '2024-08-23 02:15:00'
        }
    ]
    
    # Test single prediction with one model
    print("\n[TEST 1] Single Click Prediction (Random Forest)")
    print("-" * 70)
    result = predict(sample_clicks[0], model_name='random_forest')
    print(f"Classification: {result['classification']}")
    print(f"Fraud Probability: {result['fraud_probability']:.2%}")
    print(f"Confidence Score: {result['confidence_score']:.2%}")
    
    # Test prediction with all models
    print("\n[TEST 2] Single Click with All Models")
    print("-" * 70)
    all_results = predict_all_models(sample_clicks[1])
    for model_name, result in all_results.items():
        print(f"\n{model_name.upper()}:")
        print(f"  Classification: {result['classification']}")
        print(f"  Fraud Probability: {result['fraud_probability']:.2%}")
        print(f"  Confidence: {result['confidence_score']:.2%}")
    
    # Test batch prediction
    print("\n[TEST 3] Batch Prediction")
    print("-" * 70)
    batch_results = predict_batch(sample_clicks, model_name='random_forest')
    for i, result in enumerate(batch_results, 1):
        print(f"\nClick {i}: {result['classification']} "
              f"(Fraud Prob: {result['fraud_probability']:.2%})")
    
    # Test meta-learner if available
    detector = get_detector()
    if detector.meta_learner:
        print("\n[TEST 4] Meta-Learner Prediction")
        print("-" * 70)
        meta_result = predict(sample_clicks[1], model_name='meta_learner')
        print(f"Classification: {meta_result['classification']}")
        print(f"Fraud Probability: {meta_result['fraud_probability']:.2%}")
        print(f"Confidence Score: {meta_result['confidence_score']:.2%}")
        print(f"Meta-learner Type: {meta_result['meta_learner_type']}")
        print("\nBase Model Contributions:")
        for model_name, pred in meta_result['base_model_predictions'].items():
            print(f"  {model_name}: {pred['fraud_probability']:.2%}")
        
        test_num = 5
    else:
        print("\n[TEST 4] Meta-Learner")
        print("-" * 70)
        print("Meta-learner not yet trained. Run train_metalearner.py to create it.")
        test_num = 4
    
    # Get model info
    print(f"\n[TEST {test_num}] Model Information")
    print("-" * 70)
    info = detector.get_model_info()
    for key, value in info.items():
        if key != 'meta_learner_info':
            print(f"{key}: {value}")
    
    if 'meta_learner_info' in info:
        print("\nMeta-Learner Info:")
        for key, value in info['meta_learner_info'].items():
            print(f"  {key}: {value}")
    
    print("\n" + "=" * 70)
    print("✓ Inference tests complete!")
    print("=" * 70)
