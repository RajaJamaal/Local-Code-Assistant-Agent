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

print("=== Testing Fixed File Tools ===")

from tools.file_tools import write_file, read_file

# Test 1: Simple file write
print("1. Testing simple file write...")
result = write_file.invoke({"file_path": "fixed_test.txt", "content": "Fixed test content"})
print(f"   Result: {result}")

if os.path.exists("fixed_test.txt"):
    with open("fixed_test.txt", "r") as f:
        content = f.read()
    print(f"   ✅ File created successfully: '{content}'")
else:
    print("   ❌ File was not created")

# Test 2: Test with subdirectory
print("\n2. Testing file write with subdirectory...")
result = write_file.invoke({"file_path": "subdir/fixed_test2.txt", "content": "Subdirectory test"})
print(f"   Result: {result}")

if os.path.exists("subdir/fixed_test2.txt"):
    print("   ✅ Subdirectory file created successfully")
else:
    print("   ❌ Subdirectory file was not created")

# Test 3: Test the agent
print("\n3. Testing agent with fixed tools...")
from agent.simple_agent import run_simple_agent

result = run_simple_agent("Create a file called agent_fixed.txt with content Hello from Fixed Agent")
print(f"   Agent result: {result}")

if os.path.exists("agent_fixed.txt"):
    with open("agent_fixed.txt", "r") as f:
        content = f.read()
    print(f"   ✅ Agent file created: '{content}'")
else:
    print("   ❌ Agent file was not created")

print("\n=== Fixed Tools Test Complete ===")
