#!/usr/bin/env python3
import sys
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
os.chdir(PROJECT_ROOT)

print("=== Current Project State Analysis ===")
print(f"Python: {sys.version}")
print(f"Working dir: {os.getcwd()}")

# Test basic imports
try:
    from src.tools.file_tools import tools
    print("✅ File tools import: SUCCESS")
    print(f"   Available tools: {[t.name for t in tools]}")
except Exception as e:
    print(f"❌ File tools import: {e}")

# Test security
try:
    from src.utils.security import SecurityValidator
    print("✅ Security import: SUCCESS")
except Exception as e:
    print(f"❌ Security import: {e}")

# Test agent
try:
    from src.agent.simple_agent_improved import run_improved_agent
    print("✅ Agent import: SUCCESS")
    
    # Quick test
    result = run_improved_agent("Create test_state.txt with content Testing")
    print(f"✅ Agent test: {result}")
except Exception as e:
    print(f"❌ Agent import: {e}")

print("\n=== Current State Summary ===")
