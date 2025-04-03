import jwt
import datetime
from functools import wraps
from flask import request, jsonify, current_app
from user import User, db  # Changed from models.user import User, db

# JWT token generation
# Update the generate_token function
def generate_token(user_id):
    """Generate JWT token for authenticated user"""
    try:
        # Token payload
        payload = {
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1),
            'iat': datetime.datetime.utcnow(),
            'sub': user_id
        }
        
        # Create token with secret key
        secret_key = current_app.config.get('SECRET_KEY', 'your-secret-key')
        print(f"Using secret key: {secret_key[:5]}...")
        
        token = jwt.encode(
            payload,
            secret_key,
            algorithm='HS256'
        )
        
        # If token is returned as bytes, decode to string
        if isinstance(token, bytes):
            token = token.decode('utf-8')
            
        return token
    except Exception as e:
        print(f"Token generation error: {str(e)}")
        return str(e)

# Token validation decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            # Decode token
            data = jwt.decode(
                token, 
                current_app.config.get('SECRET_KEY', 'your-secret-key'),
                algorithms=['HS256']
            )
            
            # Get user from token data
            current_user = User.query.filter_by(id=data['sub']).first()
            
            if not current_user:
                return jsonify({'error': 'Invalid token'}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        # Pass user to the decorated function
        return f(current_user, *args, **kwargs)
    
    return decorated

# User registration
def register_user(email, password, name=None, role='user'):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return {'error': 'User already exists'}, 409
        
        # Create new user
        new_user = User(email=email, password=password, name=name, role=role)
        db.session.add(new_user)
        db.session.commit()
        
        # Generate token
        token = generate_token(new_user.id)
        
        return {
            'message': 'User registered successfully',
            'token': token,
            'user': new_user.to_dict()
        }, 201
        
    except Exception as e:
        db.session.rollback()
        return {'error': str(e)}, 500

# User login
# Update the login_user function with better error handling and logging
def login_user(email, password):
    """Authenticate user and generate token"""
    try:
        # Find user by email
        user = User.query.filter_by(email=email).first()
        
        # Add debugging
        print(f"Login attempt for email: {email}")
        print(f"User found: {user is not None}")
        
        # Check if user exists and password is correct
        if not user:
            print("User not found")
            return {'error': 'Invalid email or password'}, 401
            
        if not user.check_password(password):
            print("Password incorrect")
            return {'error': 'Invalid email or password'}, 401
        
        # Update last login time
        user.last_login = datetime.datetime.utcnow()
        db.session.commit()
        
        # Generate token
        token = generate_token(user.id)
        
        return {
            'message': 'Login successful',
            'token': token,
            'user': user.to_dict()
        }, 200
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        return {'error': str(e)}, 500