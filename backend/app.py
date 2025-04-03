from flask import Flask, jsonify, request  
from flask_cors import CORS
from api_routes import blueprint, live_clicks_bp  # Make sure to import live_clicks_bp
import pathlib
import logging
import pandas as pd
from user import db, bcrypt  # This is already correct
from routes.auth_routes import auth_blueprint
import os


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": os.environ.get('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')}})

@app.errorhandler(500)
def handle_server_error(e):
    original = getattr(e, "original_exception", None)
    logger.error(f"Server error: {str(original) if original else str(e)}")
    return jsonify(error="Internal server error"), 500

# Configure database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///fraudguard.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')

# Initialize extensions
db.init_app(app)
bcrypt.init_app(app)

# Create database tables
# Using app context instead of before_first_request which is deprecated in newer Flask versions
with app.app_context():
    db.create_all()

# Add root route here instead of blueprint
@app.route('/')
def home():
    return jsonify({"message": "FraudGuard API is running!"})

# Register blueprints with prefix
app.register_blueprint(blueprint)
app.register_blueprint(live_clicks_bp)  # Make sure this line is present
# Add this to your imports if not already there
from routes.auth_routes import auth_blueprint

# Make sure this is in your app setup
app.register_blueprint(auth_blueprint, url_prefix='/api/auth')

# Add model path validation
try:
    model_dir = pathlib.Path(__file__).parent / 'models'
    
    # Check for preprocessor
    preprocessor_path = model_dir / 'preprocessor.pkl'
    if not preprocessor_path.exists():
        logger.warning(f"Preprocessor file not found at {preprocessor_path}")
    
    # Check for model files (multiple formats)
    model_paths = [
        model_dir / 'fraud_detection_model.keras',
        model_dir / 'fraud_detection_model.h5',
        model_dir / 'fraud_detection_model.pkl'
    ]
    
    model_found = False
    for path in model_paths:
        if path.exists():
            logger.info(f"Found model at {path}")
            model_found = True
            break
    
    if not model_found:
        logger.warning("No fraud detection model found. API will attempt to load models on demand.")
    
except Exception as e:
    logger.error(f"Error checking model files: {e}")


if __name__ == '__main__':
    logger.info("Starting FraudGuard API server on port 5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
