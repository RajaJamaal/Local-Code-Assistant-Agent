#!/usr/bin/env python3
import sys
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
os.chdir(PROJECT_ROOT)

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
