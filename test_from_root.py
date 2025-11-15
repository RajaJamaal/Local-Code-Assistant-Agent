#!/usr/bin/env python3
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.getcwd())

from src.agent.simple_agent_improved import run_improved_agent

print("🧪 Testing Improved Agent from Project Root")

test_commands = [
    "Create a Python script called calculator.py with content print(2+2)",
    "List directory contents",
    "Create a README.md file with content # My Project",
    "What can you do?",
]

for cmd in test_commands:
    print(f"\n>>> {cmd}")
    result = run_improved_agent(cmd)
    print(f"Result: {result}")

print("\n🎊 Testing complete!")
