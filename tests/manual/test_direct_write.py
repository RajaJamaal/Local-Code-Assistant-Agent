#!/usr/bin/env python3
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
os.chdir(PROJECT_ROOT)

print("=== Testing Direct File Operations ===")

# Test 1: Basic file write
print("1. Testing basic file write...")
try:
    with open("basic_test.txt", "w") as f:
        f.write("Basic test content")
    print("   ✅ Basic file write: SUCCESS")
    
    with open("basic_test.txt", "r") as f:
        content = f.read()
    print(f"   📄 File content: '{content}'")
except Exception as e:
    print(f"   ❌ Basic file write failed: {e}")

# Test 2: Test with the same pattern as the tools
print("\n2. Testing tool-like file write...")
def test_tool_write(file_path, content):
    try:
        # Create directory if it doesn't exist
        directory = os.path.dirname(file_path)
        if directory:
            os.makedirs(directory, exist_ok=True)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return f"Successfully wrote to '{file_path}'"
    except Exception as e:
        return f"Error writing file: {str(e)}"

result = test_tool_write("tool_like_test.txt", "Tool-like test content")
print(f"   Tool-like write: {result}")

if os.path.exists("tool_like_test.txt"):
    with open("tool_like_test.txt", "r") as f:
        content = f.read()
    print(f"   📄 File content: '{content}'")
else:
    print("   ❌ Tool-like file was not created")

print("\n=== Direct Write Test Complete ===")
