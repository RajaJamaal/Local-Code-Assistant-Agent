#!/usr/bin/env python3
import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

print("=== Debug Test ===")

# Test 1: Check if files exist
print("1. Checking file existence:")
files_to_check = [
    'src/tools/file_tools.py',
    'src/utils/security.py', 
    'src/agent/simple_agent.py'
]

for file in files_to_check:
    exists = os.path.exists(file)
    print(f"   {file}: {'✅' if exists else '❌'}")

# Test 2: Check file sizes
print("\n2. Checking file sizes:")
for file in files_to_check:
    if os.path.exists(file):
        size = os.path.getsize(file)
        lines = sum(1 for _ in open(file)) if size > 0 else 0
        print(f"   {file}: {size} bytes, {lines} lines")
    else:
        print(f"   {file}: MISSING")

# Test 3: Try basic imports
print("\n3. Testing basic imports:")
try:
    from utils.security import SecurityValidator
    print("   ✅ SecurityValidator imported")
except Exception as e:
    print(f"   ❌ SecurityValidator import failed: {e}")

try:
    from tools.file_tools import tools
    print(f"   ✅ Tools imported: {len(tools)} tools")
except Exception as e:
    print(f"   ❌ Tools import failed: {e}")

# Test 4: Test SecurityValidator directly
print("\n4. Testing SecurityValidator:")
test_paths = ["test.txt", "valid_file.py", "../invalid.txt"]
for path in test_paths:
    try:
        result = SecurityValidator.validate_file_path(path)
        print(f"   {path}: {result}")
    except Exception as e:
        print(f"   {path}: ERROR - {e}")

print("\n=== Debug Complete ===")
