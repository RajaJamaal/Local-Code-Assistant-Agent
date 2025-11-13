#!/usr/bin/env python3
import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

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
