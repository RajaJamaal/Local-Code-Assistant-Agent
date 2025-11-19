#!/usr/bin/env python3
import sys
import os
from pathlib import Path

# Add src to path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
SRC_PATH = PROJECT_ROOT / 'src'
if str(SRC_PATH) not in sys.path:
    sys.path.append(str(SRC_PATH))
os.chdir(PROJECT_ROOT)

print("=== Debug Test ===")

# Test 1: Check if files exist
print("1. Checking file existence:")
files_to_check = [
    PROJECT_ROOT / 'src/tools/file_tools.py',
    PROJECT_ROOT / 'src/utils/security.py', 
    PROJECT_ROOT / 'src/agent/simple_agent.py'
]

for file in files_to_check:
    exists = file.exists()
    print(f"   {file.relative_to(PROJECT_ROOT)}: {'✅' if exists else '❌'}")

# Test 2: Check file sizes
print("\n2. Checking file sizes:")
for file in files_to_check:
    if file.exists():
        size = file.stat().st_size
        lines = sum(1 for _ in open(file)) if size > 0 else 0
        print(f"   {file.relative_to(PROJECT_ROOT)}: {size} bytes, {lines} lines")
    else:
        print(f"   {file.relative_to(PROJECT_ROOT)}: MISSING")

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
