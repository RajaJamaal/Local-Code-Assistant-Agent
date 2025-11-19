#!/usr/bin/env python3
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
file_tools_path = PROJECT_ROOT / 'src/tools/file_tools.py'

# Read the current file_tools.py
with open(file_tools_path, 'r') as f:
    content = f.read()

# Replace the write_file function with the fixed version
fixed_write_file = '''@tool
def write_file(file_path: str, content: str) -> str:
    """Writes content to a file with security validation."""
    if not SecurityValidator.validate_file_path(file_path):
        return "Error: Invalid file path or security violation detected."
    
    try:
        # Create directory if it doesn't exist - FIXED VERSION
        directory = os.path.dirname(file_path)
        if directory:  # Only create directories if path contains them
            os.makedirs(directory, exist_ok=True)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return f"Successfully wrote to '{file_path}'"
    except Exception as e:
        return f"Error writing file: {str(e)}"'''

# Find and replace the write_file function
import re
pattern = r'@tool\s+def write_file\(file_path: str, content: str\) -> str:.*?return f"Error writing file: {str\(e\)}"'
content = re.sub(pattern, fixed_write_file, content, flags=re.DOTALL)

# Write the fixed content back
with open(file_tools_path, 'w') as f:
    f.write(content)

print("✅ Fixed write_file tool in src/tools/file_tools.py")
