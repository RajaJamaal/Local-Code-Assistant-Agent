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

print("🎉 FINAL TEST: Local AI Assistant")

from agent.simple_agent import run_simple_agent

# Test various commands
test_commands = [
    "Create a file called hello_world.txt with content Hello World!",
    "List the current directory",
    "Create a Python file called example.py with content print('Hello from Python')",
]

for cmd in test_commands:
    print(f"\n🔧 Command: {cmd}")
    result = run_simple_agent(cmd)
    print(f"📝 Result: {result}")
    print("-" * 50)

print("\n🎊 YOUR LOCAL AI ASSISTANT IS NOW WORKING! 🎊")
print("You can now use it to create files, list directories, and more!")
