#!/usr/bin/env python3
print("=== Quick Setup Test ===")

import sys
import os
from pathlib import Path

# Add src to path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
SRC_PATH = PROJECT_ROOT / 'src'
if str(SRC_PATH) not in sys.path:
    sys.path.append(str(SRC_PATH))
os.chdir(PROJECT_ROOT)

def test_basic():
    print("1. Testing basic imports...")
    try:
        from utils.security import SecurityValidator
        from tools.file_tools import tools
        from agent.simple_agent import run_simple_agent
        print("   ✅ All imports successful!")
        print(f"   🔧 Found {len(tools)} tools")
        return True
    except Exception as e:
        print(f"   ❌ Import failed: {e}")
        return False

def test_file_tools_direct():
    print("2. Testing file tools directly...")
    try:
        from tools.file_tools import write_file, read_file
        
        # Test with simple filename
        result = write_file.invoke({"file_path": "test.txt", "content": "Hello World"})
        print(f"   ✅ Write result: {result}")
        
        if os.path.exists("test.txt"):
            result = read_file.invoke({"file_path": "test.txt"})
            print(f"   ✅ Read result: '{result}'")
            return True
        else:
            print("   ❌ File was not created")
            return False
    except Exception as e:
        print(f"   ❌ File tools failed: {e}")
        return False

def test_agent_simple():
    print("3. Testing simple agent...")
    try:
        from agent.simple_agent import run_simple_agent
        
        result = run_simple_agent("Create agent_test.txt with content Hello from Agent")
        print(f"   ✅ Agent result: {result}")
        
        if os.path.exists("agent_test.txt"):
            with open("agent_test.txt", "r") as f:
                content = f.read()
            print(f"   📄 File content: '{content}'")
            return True
        else:
            print("   ❌ Agent file was not created")
            return False
    except Exception as e:
        print(f"   ❌ Agent failed: {e}")
        return False

if __name__ == "__main__":
    tests = [test_basic, test_file_tools_direct, test_agent_simple]
    results = []
    
    for test in tests:
        try:
            results.append(test())
        except Exception as e:
            print(f"   💥 Test crashed: {e}")
            results.append(False)
    
    print(f"\n📊 Results: {sum(results)}/{len(results)} tests passed")
    
    if all(results):
        print("🎉 SUCCESS: Everything is working!")
    else:
        print("❌ Some tests failed")
