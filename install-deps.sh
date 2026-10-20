#!/bin/bash
# Install/upgrade required dependencies

echo "Installing/upgrading pip packages..."
cd /c/Users/Lanovo/Desktop/Projects_26/FraudGuard
.venv/Scripts/pip install -r requirements.txt -q

echo "Done. You can now start the server with: python run.py"