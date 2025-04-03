import os
import csv
import pandas as pd
from flask import Blueprint, jsonify

live_clicks_bp = Blueprint('live_clicks', __name__)

@live_clicks_bp.route('/api/live-clicks', methods=['GET'])
def get_live_clicks():
    try:
        # Path to the live_clicks.csv file
        csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'live_clicks.csv')
        
        # Read the CSV file
        df = pd.read_csv(csv_path)
        
        # Convert to list of dictionaries for JSON response
        clicks_data = df.to_dict(orient='records')
        
        return jsonify(clicks_data)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500