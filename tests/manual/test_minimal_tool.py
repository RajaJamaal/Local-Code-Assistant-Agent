#!/usr/bin/env python3
import os
from pathlib import Path
from langchain_core.tools import tool

PROJECT_ROOT = Path(__file__).resolve().parents[2]
os.chdir(PROJECT_ROOT)

@tool
def simple_write(file_path: str, content: str) -> str:
    """Simple file write tool."""
    try:
        print(f"DEBUG: Writing to {file_path} with content: {content}")
        with open(file_path, 'w') as f:
            f.write(content)
        return f"Success: {file_path}"
    except Exception as e:
        return f"Error: {str(e)}"

# Test the minimal tool
print("=== Testing Minimal Tool ===")
result = simple_write.invoke({"file_path": "minimal_test.txt", "content": "Minimal test"})
print(f"Result: {result}")

if os.path.exists("minimal_test.txt"):
    with open("minimal_test.txt", "r") as f:
        print(f"File content: '{f.read()}'")
else:
    print("File was not created")
