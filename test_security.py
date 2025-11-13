#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from utils.security import SecurityValidator

# Test various paths
test_paths = [
    "test.txt",
    "./test.txt", 
    "../test.txt",
    "/etc/passwd",
    "/home/test.txt"
]

print("Testing SecurityValidator:")
for path in test_paths:
    result = SecurityValidator.validate_file_path(path)
    print(f"  {path} -> {result}")
