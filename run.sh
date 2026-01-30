#!/bin/bash
# Activate virtual environment and run the API server

cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Creating one..."
    python3 -m venv venv
    echo "Installing dependencies..."
    source venv/bin/activate
    pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org fastapi "uvicorn[standard]" httpx python-dotenv pydantic
else
    source venv/bin/activate
fi

# Run the API
echo "Starting API server..."
python main.py
