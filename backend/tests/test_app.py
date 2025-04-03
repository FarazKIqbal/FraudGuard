import sys
import os
import unittest
from unittest.mock import patch, MagicMock
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import after path setup
from app import app

class TestApp(unittest.TestCase):
    def setUp(self):
        """Set up test client before each test"""
        self.app = app.test_client()
        self.app.testing = True
    
    def test_home_route(self):
        """Test the home route returns correct message"""
        response = self.app.get('/')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['message'], 'FraudGuard API is running!')
    
    def test_cors_headers(self):
        """Test CORS headers are properly set"""
        response = self.app.get('/')
        self.assertIn('Access-Control-Allow-Origin', response.headers)
        self.assertEqual(response.headers['Access-Control-Allow-Origin'], 'http://localhost:3000')
    
    def test_model_validation_no_models(self):
        """Test model validation when no models exist"""
        with patch('app.pathlib.Path.exists', return_value=False), \
             patch('app.logger.warning') as mock_warning:
            
            import importlib
            importlib.reload(__import__('app'))
            
            mock_warning.assert_any_call("No fraud detection model found. API will attempt to load models on demand.")
    
    def test_blueprint_registration(self):
        """Test that the blueprint routes are accessible"""
        response = self.app.get('/status')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'active')
        self.assertEqual(data['version'], '1.0.0')

if __name__ == '__main__':
    unittest.main()