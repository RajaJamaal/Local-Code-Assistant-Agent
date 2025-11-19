#!/usr/bin/env python3
import sys
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SRC_PATH = PROJECT_ROOT / 'src'
if str(SRC_PATH) not in sys.path:
    sys.path.append(str(SRC_PATH))
os.chdir(PROJECT_ROOT)

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
