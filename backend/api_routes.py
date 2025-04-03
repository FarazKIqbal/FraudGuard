from flask import Blueprint, request, jsonify, send_from_directory
import os
import json
import pandas as pd
import random
from datetime import datetime, timedelta
import pathlib
from pathlib import Path
from simple_inference import predict  
import logging
import io
from functools import wraps
from flask import request, jsonify, current_app
import jwt
from user import User, db

# Add token_required decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check if token is in headers
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            # Decode the token
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.filter_by(id=data['user_id']).first()
            
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token!'}), 401
            
        return f(current_user, *args, **kwargs)
    
    return decorated

# Change the blueprint name and remove the URL prefix
blueprint = Blueprint('main', __name__)

# Keep all existing route decorators as they are
@blueprint.route('/status')
def health_check():
    return jsonify({"status": "active", "version": "1.0.0"})

@blueprint.route('/')
def home():
    return jsonify({"message": "FraudGuard API is running!"})

@blueprint.route('/predict', methods=['POST'])
def predict_fraud():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No input data provided"}), 400
    
    try:
        # Get prediction from simple_inference
        result = predict(data)
        
        # Handle inference errors
        if 'error' in result:
            return jsonify({
                "error": "Prediction failed",
                "details": result['error']
            }), 500
            
        return jsonify(result)
    
    except Exception as e:
        return jsonify({
            "error": "Server error during prediction",
            "details": str(e)
        }), 500

@blueprint.route('/model-scores', methods=['GET'])
def get_model_scores():
    """Fetch model training metrics from stored results"""
    try:
        model_dir = Path(__file__).parent / 'models'
        results_file = model_dir / 'training_results.json'
        
        if not results_file.exists():
            return jsonify({"error": "Training results not available"}), 404
            
        with open(results_file, 'r') as f:
            results = json.load(f)
        
        # Validate each model's results
        required_fields = ['accuracy', 'precision', 'recall', 'f1', 'roc_auc']
        missing_models = []
        
        for model_name in ['random_forest', 'xgboost', 'neural_network']:
            if model_name not in results:
                missing_models.append(model_name)
                continue
                
            model_results = results[model_name]
            missing = [f for f in required_fields if f not in model_results]
            
            if missing:
                return jsonify({
                    "error": f"Incomplete {model_name} results",
                    "missing_fields": missing
                }), 500
        
        if missing_models:
            return jsonify({
                "error": "Missing model results",
                "missing_models": missing_models
            }), 500
            
        # Add timestamps to each model's results
        for model_name in results:
            results[model_name]['last_trained'] = Path(results_file).stat().st_ctime
            
        return jsonify(results)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@blueprint.route('/dashboard-data', methods=['GET'])
def get_dashboard_data():
    """
    Provide dashboard data including:
    - Fraud detection statistics
    - Recent fraud attempts
    - Fraud by device type
    - Fraud by time of day
    """
    try:
        # Generate sample dashboard data
        # In a real application, this would come from a database
        current_time = datetime.now()
        
        # Summary statistics
        total_clicks = random.randint(10000, 20000)
        fraud_clicks = random.randint(500, 2000)
        fraud_rate = round(fraud_clicks / total_clicks * 100, 2)
        
        # Recent fraud attempts
        recent_fraud = []
        for i in range(10):
            timestamp = current_time - timedelta(minutes=random.randint(5, 300))
            recent_fraud.append({
                "id": f"fraud-{random.randint(1000, 9999)}",
                "timestamp": timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "ip_address": f"192.168.{random.randint(1, 255)}.{random.randint(1, 255)}",
                "device_type": random.choice(["Mobile", "Desktop", "Tablet"]),
                "browser": random.choice(["Chrome", "Firefox", "Safari", "Edge"]),
                "risk_score": round(random.uniform(0.7, 0.99), 2)
            })
        
        # Fraud by device type
        device_fraud = {
            "Mobile": random.randint(100, 500),
            "Desktop": random.randint(200, 700),
            "Tablet": random.randint(50, 300)
        }
        
        # Fraud by time of day
        hours = list(range(24))
        fraud_by_hour = {str(hour): random.randint(10, 100) for hour in hours}
        
        # Fraud by country
        countries = ["US", "CN", "RU", "IN", "BR", "UK", "DE", "FR", "JP", "CA"]
        fraud_by_country = {country: random.randint(20, 200) for country in countries}
        
        dashboard_data = {
            "summary": {
                "total_clicks": total_clicks,
                "fraud_clicks": fraud_clicks,
                "fraud_rate": fraud_rate,
                "blocked_attempts": random.randint(400, 1500)
            },
            "recent_fraud": recent_fraud,
            "fraud_by_device": device_fraud,
            "fraud_by_hour": fraud_by_hour,
            "fraud_by_country": fraud_by_country,
            "last_updated": current_time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        return jsonify(dashboard_data)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# Add logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@blueprint.route('/demo-predict', methods=['POST'])
def demo_predict():
    try:
        # Validate JSON payload
        if not request.is_json:
            logger.error("Invalid request: Missing JSON payload")
            return jsonify({"error": "Request must be JSON"}), 400
            
        data = request.get_json()
        logger.info(f"Received prediction request: {json.dumps(data, indent=2)}")
        
        # Validate required fields
        required_fields = [
            'device_type', 'browser', 'operating_system', 
            'ad_position', 'device_ip_reputation', 'scroll_depth',
            'mouse_movement', 'keystrokes_detected', 'click_duration',
            'bot_likelihood_score', 'VPN_usage', 'proxy_usage'
        ]
        
        for field in required_fields:
            if field not in data:
                logger.error(f"Missing required field: {field}")
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Make prediction
        result = predict(data)
        logger.info(f"Prediction result: {json.dumps(result, indent=2)}")
        
        return jsonify(result)
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {str(e)}")
        return jsonify({"error": "Invalid JSON format"}), 400
    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@blueprint.route('/batch-predict', methods=['POST'])
def batch_predict_fraud():
    try:
        # Check if file is in the request
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
            
        file = request.files['file']
        
        # Check if filename is empty
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
            
        # Check file extension
        if not file.filename.endswith('.csv'):
            return jsonify({"error": "Only CSV files are supported"}), 400
        
        # Save the file temporarily
        temp_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp_uploads', file.filename)
        os.makedirs(os.path.dirname(temp_path), exist_ok=True)
        file.save(temp_path)
        
        # Process the CSV file
        try:
            # Import necessary modules
            import pandas as pd
            import numpy as np
            import joblib
            from data_preprocessing import feature_engineering
            
            # Load the CSV
            logger.info(f"Loading CSV file from: {temp_path}")
            input_df = pd.read_csv(temp_path)
            logger.info(f"Loaded CSV with {len(input_df)} rows and {len(input_df.columns)} columns")
            
            # Store original data for later
            original_data = input_df.copy()
            
            # Apply feature engineering to the entire dataframe at once
            logger.info("Applying feature engineering")
            processed_df = feature_engineering(input_df)
            logger.info(f"Generated {len(processed_df.columns)} features")
            
            # Load preprocessor
            base_dir = pathlib.Path(__file__).parent
            preprocessor_path = base_dir / 'models/preprocessor.pkl'
            preprocessor = joblib.load(preprocessor_path)
            if isinstance(preprocessor, dict) and 'preprocessor' in preprocessor:
                preprocessor = preprocessor['preprocessor']
            
            # Transform data using preprocessor
            logger.info("Transforming data with preprocessor")
            X = preprocessor.transform(processed_df)
            if hasattr(X, 'toarray'):
                X = X.toarray()
            
            # Load all available models
            models = {}
            model_paths = {
                'random_forest': base_dir / 'models/random_forest_model/model.pkl',
                'xgboost': base_dir / 'models/xgboost_model/model.pkl',
                'neural_network': base_dir / 'models/fraud_detection_model.keras'
            }
            
            # Initialize results structure
            results = {
                'timestamp': datetime.now().isoformat(),
                'filename': file.filename,
                'total_records': len(input_df),
                'data': original_data.to_dict('records'),
                'predictions': {}
            }
            
            # Make predictions with each available model
            for model_name, model_path in model_paths.items():
                if not model_path.exists():
                    logger.warning(f"Model {model_name} not found at {model_path}")
                    results['predictions'][model_name] = {
                        'error': f"Model not found at {model_path}"
                    }
                    continue
                
                try:
                    logger.info(f"Making predictions with {model_name}")
                    
                    # Load model based on type
                    if model_name == 'neural_network' and str(model_path).endswith(('.keras', '.h5')):
                        import tensorflow as tf
                        model = tf.keras.models.load_model(model_path)
                        predictions = model.predict(X, verbose=0)
                        fraud_probs = predictions.flatten()
                        is_fraud = fraud_probs >= 0.5
                    else:
                        model = joblib.load(model_path)
                        if hasattr(model, 'predict_proba'):
                            probs = model.predict_proba(X)
                            fraud_probs = probs[:, 1]  # Probability of class 1 (fraud)
                            is_fraud = model.predict(X)
                        else:
                            is_fraud = model.predict(X)
                            fraud_probs = is_fraud.astype(float)
                    
                    # Calculate fraud statistics
                    fraud_count = np.sum(is_fraud)
                    fraud_percentage = round(float(fraud_count) / len(is_fraud) * 100, 2)
                    
                    # Store results for this model
                    results['predictions'][model_name] = {
                        'is_fraud': is_fraud.tolist(),
                        'fraud_probabilities': fraud_probs.tolist(),
                        'fraud_count': int(fraud_count),
                        'fraud_percentage': fraud_percentage
                    }
                    
                except Exception as model_error:
                    logger.error(f"Error with model {model_name}: {str(model_error)}")
                    results['predictions'][model_name] = {
                        'error': str(model_error)
                    }
            
            # Generate CSV data for download
            # Use the first successful model for CSV generation
            csv_model = next((m for m in results['predictions'] if 'error' not in results['predictions'][m]), None)
            
            if csv_model:
                # Create a copy of original data and add prediction columns
                csv_df = original_data.copy()
                
                # Add prediction columns for each model
                for model_name, model_results in results['predictions'].items():
                    if 'error' not in model_results:
                        csv_df[f'{model_name}_is_fraud'] = model_results['is_fraud']
                        csv_df[f'{model_name}_fraud_probability'] = model_results['fraud_probabilities']
                
                # Convert to CSV string
                csv_buffer = io.StringIO()
                csv_df.to_csv(csv_buffer, index=False)
                results['csv_data'] = csv_buffer.getvalue()
            
            # Clean up temporary file
            try:
                os.remove(temp_path)
            except Exception as e:
                logger.warning(f"Failed to remove temporary file: {str(e)}")
            
            return jsonify(results)
            
        except Exception as processing_error:
            logger.error(f"Error processing CSV: {str(processing_error)}", exc_info=True)
            return jsonify({"error": f"Error processing CSV: {str(processing_error)}"}), 500
            
    except Exception as e:
        logger.error(f"Batch prediction failed: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    
    
@blueprint.route('/append-csv', methods=['POST'])
def append_to_csv():
    data = request.get_json()
    
    # Use backend/data directory
    csv_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
    csv_path = os.path.join(csv_dir, 'live_clicks.csv')
    
    try:
        # Create directory if it doesn't exist
        if not os.path.exists(csv_dir):
            os.makedirs(csv_dir)
        
        # Create file with headers if it doesn't exist
        if not os.path.exists(csv_path):
            with open(csv_path, 'w') as f:
                f.write('timestamp,device_type,browser,os,ad_position,scroll_depth,mouse_movement,click_duration,ad_id,is_fraud\n')
        
        # Check for rapid clicks by reading recent entries
        is_fraud = False
        
        # Spam detection logic
        if os.path.exists(csv_path):
            try:
                # Read last few lines to check for rapid clicks
                recent_clicks = []
                with open(csv_path, 'r') as f:
                    recent_clicks = f.readlines()[-20:]  # Get last 20 entries
                
                # Count clicks in the last 2 seconds
                current_time = datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00'))
                click_count = 0
                
                for click in recent_clicks:
                    parts = click.strip().split(',')
                    if len(parts) >= 1:
                        try:
                            click_time = datetime.fromisoformat(parts[0].replace('Z', '+00:00'))
                            time_diff = (current_time - click_time).total_seconds()
                            if time_diff < 2.0:  # Within 2 seconds
                                click_count += 1
                        except (ValueError, IndexError):
                            continue
                
                # Mark as fraud if more than 3 clicks in 2 seconds
                if click_count >= 3:
                    is_fraud = True
                    logger.info(f"Fraud detected: {click_count} clicks in 2 seconds")
            except Exception as e:
                logger.error(f"Error in spam detection: {str(e)}")
        
        # Get ad_id from data or use default
        ad_id = data.get('ad_id', 'unknown')
        
        # Append new row with updated fraud status and ad_id
        with open(csv_path, 'a') as f:
            f.write(f"{data['timestamp']},{data['device_type']},{data['browser']},"
                    f"{data['operating_system']},{data['ad_position']},"
                    f"{data['scroll_depth']},{data['mouse_movement']},"
                    f"{data['click_duration']},{ad_id},{1 if is_fraud else 0}\n")
        
        return jsonify({"status": "success", "file_path": csv_path, "is_fraud": is_fraud}), 200
    
    except Exception as e:
        logger.error(f"CSV append error: {str(e)}")
        return jsonify({"error": "Failed to update CSV"}), 500

# Add these routes if they don't exist

@blueprint.route('/auth/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    """Get current user details"""
    return jsonify({
        'user': current_user.to_dict()
    }), 200

@blueprint.route('/auth/user/profile', methods=['GET', 'PUT'])
@token_required
def user_profile(current_user):
    """Get or update user profile"""
    if request.method == 'GET':
        return jsonify({
            'user': current_user.to_dict()
        }), 200
    
    elif request.method == 'PUT':
        data = request.get_json()
        
        # Update user fields
        if data.get('name'):
            current_user.name = data.get('name')
        
        # Save changes
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': current_user.to_dict()
        }), 200
        
live_clicks_bp = Blueprint('live_clicks', __name__)

@live_clicks_bp.route('/api/live-clicks', methods=['GET'])
def get_live_clicks():
    try:
        csv_path = os.path.join(os.path.dirname(__file__), 'data', 'live_clicks.csv')
        
        if not os.path.exists(csv_path):
            logger.error(f"CSV file not found at {csv_path}")
            return jsonify({"error": "Data file not found"}), 404

        # Read CSV with error handling
        df = pd.read_csv(csv_path, skip_blank_lines=True, on_bad_lines='skip')
        
        if df.empty:
            logger.warning("CSV file is empty or all lines were filtered out")
            return jsonify([]), 200
            
        # Convert NaN values to null
        clicks_data = df.where(pd.notnull(df), None).to_dict(orient='records')
        
        return jsonify(clicks_data)

    except Exception as e:
        logger.error(f"Error loading live clicks: {str(e)}")
        return jsonify({"error": "Failed to process data file"}), 500