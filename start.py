#!/usr/bin/env python3
"""
Alternative startup script that uses the venv Python interpreter directly
"""
import sys
import os
import subprocess
from pathlib import Path

# Get the directory where this script is located
script_dir = Path(__file__).parent.absolute()
venv_python = script_dir / "venv" / "bin" / "python"

# Check if venv exists
if not venv_python.exists():
    print("Virtual environment not found. Please run:")
    print("  python3 -m venv venv")
    print("  source venv/bin/activate")
    print("  pip install -r requirements.txt")
    sys.exit(1)

# Use the venv Python to run main.py
main_py = script_dir / "main.py"
os.chdir(script_dir)
subprocess.run([str(venv_python), str(main_py)] + sys.argv[1:])
