import os
import sys
from flask import Flask
from user import db, User  # Changed from models.user import db, User

def create_admin_user(email, password, name="Admin"):
    """Create an admin user in the database"""
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///fraudguard.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    
    with app.app_context():
        # Create tables if they don't exist
        db.create_all()
        
        # Check if admin already exists
        existing_admin = User.query.filter_by(email=email).first()
        if existing_admin:
            print(f"Admin user with email {email} already exists.")
            return
        
        # Create new admin user
        admin = User(
            email=email,
            password=password,
            name=name,
            role='admin'
        )
        
        db.session.add(admin)
        db.session.commit()
        print(f"Admin user {email} created successfully!")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python create_admin.py <email> <password> [name]")
        sys.exit(1)
    
    email = sys.argv[1]
    password = sys.argv[2]
    name = sys.argv[3] if len(sys.argv) > 3 else "Admin"
    
    create_admin_user(email, password, name)