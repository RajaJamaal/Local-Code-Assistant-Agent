#!/usr/bin/env python3
print("=== Testing Complete Setup ===")

import sys
import os
import time
from pathlib import Path

# Add src to path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
SRC_PATH = PROJECT_ROOT / 'src'
if str(SRC_PATH) not in sys.path:
    sys.path.append(str(SRC_PATH))
os.chdir(PROJECT_ROOT)

def test_ollama_direct():
    """Test Ollama directly without LangChain."""
    print("1. Testing Ollama direct connection...")
    try:
        import ollama
        
        start_time = time.time()
        response = ollama.generate(
            model='phi4-mini:3.8b', 
            prompt='Say just "TEST SUCCESS" and nothing else',
            options={'temperature': 0.1, 'num_predict': 20}
        )
        elapsed = time.time() - start_time
        print(f"   ✅ Ollama direct response: '{response['response'].strip()}'")
        print(f"   ⏱️  Response time: {elapsed:.2f}s")
        return True
        
    except Exception as e:
        print(f"   ❌ Ollama direct failed: {e}")
        return False

def test_tools():
    """Test all tools."""
    print("2. Testing tools...")
    try:
        from tools.file_tools import tools
        
        # Test file creation
        result = tools[1].invoke({"file_path": "test_tool.txt", "content": "Tool test"})
        print(f"   ✅ File tool: {result}")
        
        # Test directory listing
        result = tools[2].invoke({})
        print(f"   ✅ Directory tool: {result.split()[0]} items listed")
        
        return True
    except Exception as e:
        print(f"   ❌ Tools failed: {e}")
        return False

def test_simple_agent():
    """Test the simple agent."""
    print("3. Testing simple agent...")
    try:
        from agent.simple_agent import run_simple_agent
        
        # Quick file creation test
        result = run_simple_agent("Create quick_test.txt with content Quick Test")
        print(f"   ✅ Agent file creation: {result}")
        
        # Verify file was created
        if os.path.exists("quick_test.txt"):
            with open("quick_test.txt", "r") as f:
                content = f.read()
            print(f"   📄 File content: '{content}'")
            return True
        else:
            print("   ❌ File was not created")
            return False
            
    except Exception as e:
        print(f"   ❌ Agent failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    tests = [
        test_ollama_direct,
        test_tools, 
        test_simple_agent
    ]
    
    results = []
    for test in tests:
        try:
            results.append(test())
            time.sleep(1)  # Brief pause between tests
        except Exception as e:
            print(f"   ❌ Test crashed: {e}")
            results.append(False)
    
    if all(results):
        print("\n🎉 ALL TESTS PASSED! Your local AI assistant is ready!")
    else:
        print(f"\n⚠️  Some tests failed. {sum(results)}/{len(results)} passed.")
        print("💡 Check Ollama service and model availability.")
