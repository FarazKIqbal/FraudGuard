from flask import Blueprint, jsonify
from services.auth_service import token_required

# Create blueprint
protected_blueprint = Blueprint('protected', __name__)

@protected_blueprint.route('/dashboard-data', methods=['GET'])
@token_required
def get_dashboard_data(current_user):
    """Get protected dashboard data"""
    # You can use current_user to customize the response
    return jsonify({
        'message': f'Hello, {current_user.name or current_user.email}!',
        'role': current_user.role,
        'data': {
            'stats': {
                'total_clicks': 1250,
                'fraudulent_clicks': 87,
                'fraud_rate': '6.96%'
            },
            'recent_activity': [
                {'timestamp': '2023-07-15T14:30:00', 'action': 'Login', 'status': 'Success'},
                {'timestamp': '2023-07-15T14:35:22', 'action': 'Data Export', 'status': 'Success'},
                {'timestamp': '2023-07-15T15:12:45', 'action': 'Model Update', 'status': 'In Progress'}
            ]
        }
    }), 200