import requests
import json
import sys
from datetime import datetime

def test_predict_endpoint(host="localhost", port=5000):
    """
    Test the /predict endpoint with sample data
    """
    url = f"http://{host}:{port}/predict"
    
    # Current timestamp for testing
    current_time = datetime.now().isoformat()
    
    # Sample test cases
    test_cases = [
        {
            "name": "Normal user behavior",
            "data": {
                'timestamp': current_time,
                'device_type': 'Desktop',
                'browser': 'Chrome',
                'operating_system': 'Windows',
                'ad_position': 'middle',
                'device_ip_reputation': 'trusted',
                'scroll_depth': 75,
                'mouse_movement': 450,
                'keystrokes_detected': 120,
                'click_duration': 1.2,
                'bot_likelihood_score': 0.15,
                'VPN_usage': 0,
                'proxy_usage': 0,
                'click_frequency': 5,
                'time_on_site': 300,
                'time_of_day': '14:30'
            }
        },
        {
            "name": "Suspicious behavior",
            "data": {
                'timestamp': current_time,
                'device_type': 'Mobile',
                'browser': 'Unknown',
                'operating_system': 'Android',
                'ad_position': 'top',
                'device_ip_reputation': 'suspicious',
                'scroll_depth': 10,
                'mouse_movement': 5,
                'keystrokes_detected': 2,
                'click_duration': 0.1,
                'bot_likelihood_score': 0.85,
                'VPN_usage': 1,
                'proxy_usage': 1,
                'click_frequency': 50,
                'time_on_site': 10,
                'time_of_day': '03:15'
            }
        },
        {
            "name": "Minimal test case",
            "data": {
                'timestamp': current_time,
                'device_type': 'Tablet',
                'browser': 'Safari',
                'operating_system': 'iOS',
                'ad_position': 'bottom',
                'device_ip_reputation': 'neutral',
                'scroll_depth': 30,
                'mouse_movement': 100,
                'keystrokes_detected': 25,
                'click_duration': 0.8,
                'bot_likelihood_score': 0.45,
                'VPN_usage': 0,
                'proxy_usage': 0,
                'click_frequency': 10,
                'time_on_site': 120,
                'time_of_day': '10:00'
            }
        }
    ]
    
    print("Testing /predict endpoint...")
    
    for i, test in enumerate(test_cases):
        print(f"\nTest {i+1}: {test['name']}")
        print(f"Request data: {json.dumps(test['data'], indent=2)}")
        
        try:
            response = requests.post(url, json=test['data'], timeout=5)
            print(f"Status code: {response.status_code}")
            
            if response.status_code == 200:
                print(f"Response: {json.dumps(response.json(), indent=2)}")
            else:
                print(f"Error: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
    
    print("\nTesting complete!")

if __name__ == "__main__":
    # Allow custom host/port from command line
    host = sys.argv[1] if len(sys.argv) > 1 else "localhost"
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 5000
    
    test_predict_endpoint(host, port)