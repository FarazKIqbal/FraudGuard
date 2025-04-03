import requests
import os
import sys
import json
from datetime import datetime

def test_batch_api(csv_file, api_url="http://localhost:5000/batch-predict"):
    """
    Test the batch prediction API endpoint with enhanced logging
    
    Args:
        csv_file (str): Path to the CSV file to test
        api_url (str): URL of the batch prediction API endpoint
    """
    print(f"Testing batch prediction API with file: {csv_file}")
    
    if not os.path.exists(csv_file):
        print(f"Error: File not found: {csv_file}")
        return
    
    # Print file info for debugging
    file_size = os.path.getsize(csv_file)
    print(f"File size: {file_size} bytes")
    
    # Read first few lines to verify format
    try:
        with open(csv_file, 'r') as f:
            header = f.readline().strip()
            first_row = f.readline().strip() if f.readline() else ""
        
        print("CSV Header:")
        print(header)
        print("First data row:")
        print(first_row)
        
        # Count columns
        header_cols = header.split(',')
        print(f"Number of columns: {len(header_cols)}")
    except Exception as e:
        print(f"Error reading CSV file: {e}")
    
    try:
        # Create multipart form data
        files = {'file': (os.path.basename(csv_file), open(csv_file, 'rb'), 'text/csv')}
        
        # Send request to API
        print(f"Sending request to {api_url}...")
        response = requests.post(api_url, files=files)
        
        # Check response
        print(f"Response status code: {response.status_code}")
        
        if response.status_code == 200:
            # Success
            try:
                result = response.json()
                print("API Response:")
                print(json.dumps(result, indent=2))
                
                # Print summary
                if 'predictions' in result and len(result['predictions']) > 0:
                    # Get first model's data
                    first_model = next(iter(result['predictions']))
                    model_data = result['predictions'][first_model]
                    
                    print("\nSummary:")
                    print(f"Total records: {result.get('total_records', 'N/A')}")
                    if 'fraud_count' in model_data:
                        print(f"Fraud count: {model_data.get('fraud_count', 'N/A')}")
                        print(f"Fraud percentage: {model_data.get('fraud_percentage', 'N/A')}%")
                    else:
                        print(f"Model error: {model_data.get('error', 'Unknown error')}")
            except json.JSONDecodeError:
                print("Error: Could not parse JSON response")
                print(f"Response content: {response.text[:500]}...")
        else:
            # Error
            print(f"Error response: {response.text}")
            
    except Exception as e:
        print(f"Error testing batch API: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Close the file
        files['file'][1].close()

if __name__ == "__main__":
    # Get CSV file path from command line argument
    csv_file = sys.argv[1] if len(sys.argv) > 1 else "test_clicks.csv"
    
    # Get API URL from command line argument
    api_url = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:5000/batch-predict"
    
    test_batch_api(csv_file, api_url)