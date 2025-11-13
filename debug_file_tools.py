#!/usr/bin/env python3
import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

print("=== Debug File Tools ===")

from tools.file_tools import write_file, read_file, list_directory
from utils.security import SecurityValidator

# Test 1: Check current directory and permissions
print("1. Current directory and permissions:")
print(f"   Current dir: {os.getcwd()}")
print(f"   Write permission: {os.access('.', os.W_OK)}")

# Test 2: Test SecurityValidator with actual paths
print("\n2. Testing SecurityValidator with actual file paths:")
test_paths = [
    "debug_test.txt",
    "./debug_test2.txt",
    "subdir/debug_test3.txt"
]

for path in test_paths:
    result = SecurityValidator.validate_file_path(path)
    print(f"   {path}: {result}")

# Test 3: Test write_file function directly
print("\n3. Testing write_file function directly:")
try:
    # Test with simple filename
    result = write_file.invoke({"file_path": "direct_test.txt", "content": "Direct test content"})
    print(f"   Write result: {result}")
    
    if os.path.exists("direct_test.txt"):
        with open("direct_test.txt", "r") as f:
            content = f.read()
        print(f"   ✅ File created successfully: '{content}'")
    else:
        print("   ❌ File was not created")
        
except Exception as e:
    print(f"   ❌ Write failed: {e}")

# Test 4: Test the tools dictionary
print("\n4. Testing tools dictionary:")
from tools.file_tools import tools
for tool in tools:
    print(f"   Tool: {tool.name}")
    if tool.name == "write_file":
        # Test the tool directly
        try:
            result = tool.invoke({"file_path": "tool_test.txt", "content": "Tool test"})
            print(f"   ✅ {tool.name} result: {result}")
        except Exception as e:
            print(f"   ❌ {tool.name} failed: {e}")

# Test 5: Test directory listing
print("\n5. Testing directory listing:")
try:
    result = list_directory.invoke({})
    print(f"   Directory listing: {len(result.splitlines())} items")
    print(f"   First few items: {result.splitlines()[:3]}")
except Exception as e:
    print(f"   ❌ Directory listing failed: {e}")

print("\n=== Debug Complete ===")
