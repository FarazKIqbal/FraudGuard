import sys
import os
import unittest
from unittest.mock import patch, MagicMock
import json
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier

# Add the parent directory to path to import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app
import data_preprocessing

class TestIntegration(unittest.TestCase):
    def setUp(self):
        """Set up test client before each test"""
        self.app = app.test_client()
        self.app.testing = True
        
        # Sample valid input data
        self.valid_input = {
            "timestamp": "2023-06-15T14:30:00",
            "device_type": "mobile",
            "browser": "chrome",
            "operating_system": "android",
            "ad_position": "top",
            "device_ip_reputation": "Suspicious",
            "scroll_depth": 75,
            "mouse_movement": 120,
            "keystrokes_detected": 0,
            "click_duration": 0.8,
            "bot_likelihood_score": 0.65,
            "VPN_usage": 1,
            "proxy_usage": 0
        }
    
    # Fix the path to match your actual module structure
    @patch('simple_inference.joblib.load')
    def test_end_to_end_prediction_flow(self, mock_load):
        """Test the entire prediction flow from request to response"""
        # Create a simple mock model instead of using model_training
        mock_model = RandomForestClassifier()
        X = np.array([[0, 0], [1, 1]])
        y = np.array([0, 1])
        mock_model.fit(X, y)
        
        # Create real preprocessor
        mock_preprocessor = data_preprocessing.create_preprocessing_pipeline()
        
        # Configure mock to return our objects
        mock_load.return_value = {'preprocessor': mock_preprocessor}
        
        # Make the request to the correct endpoint
        response = self.app.post('/predict', 
                                json=self.valid_input,
                                content_type='application/json')
        
        # Assertions
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('prediction', data)
    
    def test_data_preprocessing_to_model_pipeline(self):
        """Test that preprocessed data can be fed into the model"""
        # Load sample data
        sample_data = pd.DataFrame({
            'timestamp': ['2023-01-01 12:00:00'],
            'device_type': ['mobile'],
            'browser': ['chrome'],
            'operating_system': ['android'],
            'ad_position': ['top'],
            'device_ip_reputation': ['Suspicious'],
            'scroll_depth': [75],
            'mouse_movement': [120],
            'keystrokes_detected': [0],
            'click_duration': [0.8],
            'bot_likelihood_score': [0.65],
            'VPN_usage': [1],
            'proxy_usage': [0]
        })
        
        # Apply feature engineering
        processed_data = data_preprocessing.feature_engineering(sample_data)
        
        # Create preprocessing pipeline
        preprocessor = data_preprocessing.create_preprocessing_pipeline()
        
        # Transform data
        transformed_data = preprocessor.fit_transform(processed_data.drop('timestamp', axis=1))
        
        # Create and train a simple model directly instead of using model_training
        model = RandomForestClassifier()
        X = transformed_data
        y = np.array([0])  # Dummy target
        model.fit(X, y)
        
        # Ensure model can make predictions with the transformed data
        predictions = model.predict(transformed_data)
        self.assertIsNotNone(predictions)
        self.assertEqual(len(predictions), 1)

if __name__ == '__main__':
    unittest.main()