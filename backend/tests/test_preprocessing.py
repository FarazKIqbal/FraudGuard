import sys
import os
import unittest
from unittest.mock import patch, MagicMock, mock_open
import pandas as pd
import numpy as np

# Add the parent directory to path to import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from data_preprocessing import feature_engineering, load_raw_data, create_preprocessing_pipeline

class TestPreprocessing(unittest.TestCase):
    def test_feature_engineering(self):
        """Test feature engineering function"""
        # Create test data
        test_data = pd.DataFrame({
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
        
        # Convert timestamp to datetime
        test_data['timestamp'] = pd.to_datetime(test_data['timestamp'])
        
        # Call the function
        result = feature_engineering(test_data)
        
        # Assertions
        self.assertIn('hour', result.columns)
        self.assertIn('day_of_week', result.columns)
        self.assertIn('is_weekend', result.columns)
        self.assertIn('month', result.columns)
        self.assertIn('interaction_intensity', result.columns)
        self.assertIn('dwell_speed', result.columns)
        self.assertIn('fraud_risk_score', result.columns)
        
        # Check calculated values
        self.assertEqual(result['hour'].iloc[0], 12)
        self.assertEqual(result['month'].iloc[0], 1)
        
        # Check fraud risk score calculation
        expected_risk = 0.4 * 0.65 + 0.3 * 0.5 + 0.2 * 1 + 0.1 * 0
        self.assertAlmostEqual(result['fraud_risk_score'].iloc[0], expected_risk)
    
    @patch('data_preprocessing.pd.read_csv')
    @patch('data_preprocessing.pathlib.Path')
    def test_load_raw_data(self, mock_path, mock_read_csv):
        """Test loading raw data"""
        # Setup mocks
        mock_path_instance = MagicMock()
        mock_path.return_value = mock_path_instance
        mock_path_instance.__truediv__.return_value = mock_path_instance
        mock_path_instance.exists.return_value = True
        
        # Mock DataFrame
        mock_df = pd.DataFrame({
            'timestamp': ['2023-01-01 12:00:00'],
            'is_fraudulent': [1],
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
        mock_read_csv.return_value = mock_df
        
        # Call the function
        result = load_raw_data()
        
        # Assertions
        self.assertIsInstance(result, pd.DataFrame)
        self.assertEqual(len(result), 1)
        mock_read_csv.assert_called_once()
    
    def test_create_preprocessing_pipeline(self):
        """Test creating preprocessing pipeline"""
        # Call the function
        pipeline = create_preprocessing_pipeline()
        
        # Assertions
        self.assertIsNotNone(pipeline)
        self.assertEqual(len(pipeline.transformers), 2)  # Should have numeric and categorical transformers
        
        # Check transformer names
        transformer_names = [name for name, _, _ in pipeline.transformers]
        self.assertIn('num', transformer_names)
        self.assertIn('cat', transformer_names)

if __name__ == '__main__':
    unittest.main()