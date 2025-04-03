from flask import Blueprint, request, jsonify
from services.auth_service import register_user, login_user, token_required
from user import User  # Changed from models.user import User

# Create blueprint
auth_blueprint = Blueprint('auth', __name__)

@auth_blueprint.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    
    # Validate input
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400
    
    # Register user
    result, status_code = register_user(
        email=data.get('email'),
        password=data.get('password'),
        name=data.get('name'),
        role=data.get('role', 'user')
    )
    
    return jsonify(result), status_code

@auth_blueprint.route('/login', methods=['POST'])
def login():
    """Login user and return token"""
    data = request.get_json()
    
    # Validate input
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400
    
    # Login user
    result, status_code = login_user(
        email=data.get('email'),
        password=data.get('password')
    )
    
    return jsonify(result), status_code

@auth_blueprint.route('/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    """Get current user details"""
    return jsonify({
        'user': current_user.to_dict()
    }), 200

@auth_blueprint.route('/user/profile', methods=['GET', 'PUT'])
@token_required
def user_profile(current_user):
    """Get or update user profile"""
    if request.method == 'GET':
        return jsonify({
            'user': current_user.to_dict()
        }), 200
    
    elif request.method == 'PUT':
        data = request.get_json()
        
        try:
            # Update user fields
            if data.get('name'):
                current_user.name = data.get('name')
            
            # Import db if not already imported
            from user import db
            
            # Save changes
            db.session.commit()
            
            return jsonify({
                'message': 'Profile updated successfully',
                'user': current_user.to_dict()
            }), 200
        except Exception as e:
            # Log the error
            print(f"Error updating profile: {str(e)}")
            db.session.rollback()
            return jsonify({
                'error': 'Failed to update profile'
            }), 500

@auth_blueprint.route('/users', methods=['GET'])
@token_required
def get_users(current_user):
    """Get all users (admin only)"""
    # Check if user is admin
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    users = User.query.all()
    return jsonify({
        'users': [user.to_dict() for user in users]
    }), 200