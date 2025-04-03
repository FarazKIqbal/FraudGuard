import sys
import os
import unittest
from unittest.mock import patch, MagicMock
import json
import numpy as np

# Add the parent directory to path to import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import after path setup
from app import app
# Fix the import to match your actual project structure
from prediction_service import load_prediction_models as load_models

class TestPredictionAPI(unittest.TestCase):
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
    
    @patch('prediction_service.load_prediction_models')
    def test_predict_endpoint_success(self, mock_load_models):
        """Test the prediction endpoint with valid data"""
        # Mock the model and preprocessor
        mock_model = MagicMock()
        mock_preprocessor = MagicMock()
        
        # Configure mocks
        mock_model.predict_proba.return_value = np.array([[0.7, 0.3]])
        mock_preprocessor.transform.return_value = np.array([[1, 2, 3, 4, 5]])
        mock_load_models.return_value = (mock_model, mock_preprocessor)
        
        # Make the request
        response = self.app.post('/api/predict', 
                                json=self.valid_input,
                                content_type='application/json')
        
        # Assertions
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('prediction', data)
        self.assertIn('probability', data)
        self.assertEqual(data['prediction'], 0)  # 0 = not fraud (probability < 0.5)
        self.assertAlmostEqual(data['probability'], 0.3)
        
        # Verify model was called
        mock_model.predict_proba.assert_called_once()
        mock_preprocessor.transform.assert_called_once()
    
    def test_predict_endpoint_invalid_data(self):
        """Test the prediction endpoint with invalid data"""
        # Missing required fields
        invalid_input = {
            "device_type": "mobile",
            "browser": "chrome"
            # Missing other required fields
        }
        
        # Make the request
        response = self.app.post('/api/predict', 
                                json=invalid_input,
                                content_type='application/json')
        
        # Assertions
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)
    
    @patch('routes.prediction.load_models')
    def test_predict_endpoint_model_error(self, mock_load_models):
        """Test the prediction endpoint when model throws an error"""
        # Mock the model and preprocessor
        mock_model = MagicMock()
        mock_preprocessor = MagicMock()
        
        # Configure mocks to raise an exception
        mock_preprocessor.transform.side_effect = Exception("Model processing error")
        mock_load_models.return_value = (mock_model, mock_preprocessor)
        
        # Make the request
        response = self.app.post('/api/predict', 
                                json=self.valid_input,
                                content_type='application/json')
        
        # Assertions
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertIn('Model processing error', data['error'])
    
    @patch('routes.prediction.load_models')
    def test_batch_predict_endpoint(self, mock_load_models):
        """Test the batch prediction endpoint"""
        # Mock the model and preprocessor
        mock_model = MagicMock()
        mock_preprocessor = MagicMock()
        
        # Configure mocks
        mock_model.predict_proba.return_value = np.array([[0.7, 0.3], [0.2, 0.8]])
        mock_preprocessor.transform.return_value = np.array([[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]])
        mock_load_models.return_value = (mock_model, mock_preprocessor)
        
        # Batch input with two records
        batch_input = {
            "records": [
                self.valid_input,
                self.valid_input  # Using the same data for simplicity
            ]
        }
        
        # Make the request
        response = self.app.post('/api/batch-predict', 
                                json=batch_input,
                                content_type='application/json')
        
        # Assertions
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('predictions', data)
        self.assertEqual(len(data['predictions']), 2)
        self.assertEqual(data['predictions'][0]['prediction'], 0)  # Not fraud
        self.assertEqual(data['predictions'][1]['prediction'], 1)  # Fraud
        
        # Verify model was called
        mock_model.predict_proba.assert_called_once()
        mock_preprocessor.transform.assert_called_once()

if __name__ == '__main__':
    unittest.main()