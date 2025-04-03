import sys
import os
import unittest
from unittest.mock import patch, MagicMock
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app

class TestAPIRoutes(unittest.TestCase):
    def setUp(self):
        """Set up test client before each test"""
        self.app = app.test_client()
        self.app.testing = True
    
    def test_status_endpoint(self):
        """Test the status endpoint"""
        response = self.app.get('/status')
        
        if response.content_type == 'application/json':
            data = json.loads(response.data)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(data['status'], 'active')
        else:
            self.assertEqual(response.status_code, 200)
    
    def test_metrics_endpoint(self):
        """Test the metrics endpoint"""
        response = self.app.get('/api/metrics')
        
        self.assertEqual(response.status_code, 404)
        
    def test_predict_endpoint_success(self):
        """Test the predict endpoint with valid data"""
        test_data = {
            'device_type': 'mobile',
            'browser': 'chrome',
            'operating_system': 'android',
            'timestamp': '2023-06-15T14:30:00',
            'ad_position': 'top',
            'device_ip_reputation': 'Suspicious',
            'scroll_depth': 75,
            'mouse_movement': 120,
            'keystrokes_detected': 0,
            'click_duration': 0.8,
            'bot_likelihood_score': 0.65,
            'VPN_usage': 1,
            'proxy_usage': 0
        }
        
        response = self.app.post('/predict', 
                                json=test_data,
                                content_type='application/json')
        
        if response.content_type == 'application/json':
            data = json.loads(response.data)
            self.assertEqual(response.status_code, 200)
            self.assertIn('prediction', data)
        else:
            self.assertEqual(response.status_code, 200)
    
    def test_predict_endpoint_no_data(self):
        """Test the predict endpoint with no data"""
        response = self.app.post('/predict', 
                                json=None,
                                content_type='application/json')
        
        if response.content_type == 'application/json':
            data = json.loads(response.data)
            self.assertEqual(response.status_code, 400)
            self.assertIn('error', data)
        else:
            self.assertEqual(response.status_code, 400)

if __name__ == '__main__':
    unittest.main()