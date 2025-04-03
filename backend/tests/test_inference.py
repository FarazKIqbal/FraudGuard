import sys
import os
import unittest
from unittest.mock import patch, MagicMock, PropertyMock
import numpy as np
import pandas as pd

# Add the parent directory to path to import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from simple_inference import load_model, preprocess_input, predict

class TestInference(unittest.TestCase):
    @patch('simple_inference.joblib.load')
    @patch('simple_inference.pathlib.Path')
    @patch('tensorflow.keras.models.load_model')
    def test_load_model(self, mock_keras_load, mock_path, mock_joblib_load):
        """Test the model loading functionality"""
        # Setup mocks
        mock_path_instance = MagicMock()
        mock_path.return_value = mock_path_instance
        mock_path_instance.__truediv__.return_value = mock_path_instance
        
        # Mock exists() to return True for the first model path (.keras)
        mock_path_instance.exists.side_effect = [True, False, False]
        
        # Properly set up the suffix property
        type(mock_path_instance).suffix = PropertyMock(return_value='.keras')
        
        # Mock preprocessor loading
        mock_preprocessor = MagicMock()
        mock_joblib_load.return_value = {'preprocessor': mock_preprocessor}
        
        # Mock model loading
        mock_model = MagicMock()
        mock_keras_load.return_value = mock_model
        
        # Call the function
        preprocessor, model, model_type = load_model()
        
        # Assertions
        self.assertEqual(preprocessor, mock_preprocessor)
        self.assertEqual(model, mock_model)
        self.assertEqual(model_type, "keras")
        mock_joblib_load.assert_called_once()
        mock_keras_load.assert_called_once()
    
    @patch('simple_inference.feature_engineering')
    def test_preprocess_input(self, mock_feature_engineering):
        """Test input preprocessing"""
        # Setup mocks
        mock_preprocessor = MagicMock()
        mock_preprocessor.transform.return_value = np.array([[0.1, 0.2, 0.3]])
        
        mock_feature_engineering.return_value = pd.DataFrame({
            'feature1': [1],
            'feature2': [2],
            'feature3': [3]
        })
        
        # Test data
        test_data = {
            'device_type': 'mobile',
            'browser': 'chrome',
            'operating_system': 'android'
        }
        
        # Call the function
        result = preprocess_input(test_data, mock_preprocessor)
        
        # Assertions
        self.assertIsInstance(result, np.ndarray)
        mock_feature_engineering.assert_called_once()
        mock_preprocessor.transform.assert_called_once()

    @patch('simple_inference.load_model')
    @patch('simple_inference.preprocess_input')
    def test_predict(self, mock_preprocess, mock_load_model):
        """Test the prediction functionality"""
        # Setup mocks
        mock_preprocessor = MagicMock()
        mock_model = MagicMock()
        mock_model.predict.return_value = np.array([[0.8]])
        
        mock_load_model.return_value = (mock_preprocessor, mock_model, "keras")
        mock_preprocess.return_value = np.array([[0.1, 0.2, 0.3]])
        
        # Test data
        test_data = {
            'device_type': 'mobile',
            'browser': 'chrome',
            'operating_system': 'android'
        }
        
        # Call the function
        result = predict(test_data)
        
        # Assertions
        self.assertIn('prediction', result)
        self.assertTrue(result['prediction']['is_fraud'])
        self.assertAlmostEqual(result['prediction']['fraud_probability'], 0.8)
        mock_load_model.assert_called_once()
        mock_preprocess.assert_called_once()

if __name__ == '__main__':
    unittest.main()