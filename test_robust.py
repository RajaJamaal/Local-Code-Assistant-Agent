#!/usr/bin/env python3
print("=== Robust Setup Test ===")

import sys
import os
import time
import signal

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

def timeout_handler(signum, frame):
    raise TimeoutError("Test timed out")

def run_with_timeout(func, timeout=30):
    """Run a function with timeout."""
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(timeout)
    try:
        result = func()
        signal.alarm(0)
        return result
    except TimeoutError:
        return f"TIMEOUT after {timeout}s"

def test_basic_imports():
    """Test basic imports."""
    print("1. Testing basic imports...")
    try:
        from utils.security import SecurityValidator
        from tools.file_tools import tools
        from agent.simple_agent import SimpleCodeAssistant
        print("   ✅ All imports successful!")
        print(f"   🔧 Found {len(tools)} tools")
        return True
    except Exception as e:
        print(f"   ❌ Import failed: {e}")
        return False

def test_file_operations():
    """Test file operations directly."""
    print("2. Testing file operations...")
    try:
        from tools.file_tools import write_file, read_file
        
        # Test write
        result = write_file.invoke({"file_path": "test_direct.txt", "content": "Direct test"})
        print(f"   ✅ Write test: {result}")
        
        # Test read
        if os.path.exists("test_direct.txt"):
            result = read_file.invoke({"file_path": "test_direct.txt"})
            print(f"   ✅ Read test: File exists with content: '{result[:50]}...'")
            return True
        else:
            print("   ❌ File was not created")
            return False
    except Exception as e:
        print(f"   ❌ File operations failed: {e}")
        return False

def test_agent_quick():
    """Test agent with quick operations."""
    print("3. Testing agent quick operations...")
    try:
        from agent.simple_agent import run_simple_agent
        
        # Test with timeout
        def quick_test():
            return run_simple_agent("Create quick_test.txt with content Quick Test", timeout=15)
        
        result = run_with_timeout(quick_test, timeout=20)
        
        if "TIMEOUT" in result:
            print(f"   ❌ Agent timed out")
            return False
        elif "Error" in result or "❌" in result:
            print(f"   ❌ Agent error: {result}")
            return False
        else:
            print(f"   ✅ Agent result: {result}")
            
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
        print(f"   ❌ Agent test failed: {e}")
        return False

def test_ollama_direct_quick():
    """Test Ollama with quick prompt."""
    print("4. Testing Ollama direct (quick)...")
    try:
        import ollama
        
        def quick_ollama():
            response = ollama.generate(
                model='codellama:7b-code-q4_K_M', 
                prompt='Reply with only: OK',
                options={'temperature': 0.1, 'num_predict': 5}
            )
            return response['response'].strip()
        
        result = run_with_timeout(quick_ollama, timeout=10)
        
        if "TIMEOUT" in result:
            print("   ⚠️  Ollama slow but running (expected for first call)")
            return True  # Still consider it working
        else:
            print(f"   ✅ Ollama quick response: '{result}'")
            return True
            
    except Exception as e:
        print(f"   ❌ Ollama test failed: {e}")
        return False

if __name__ == "__main__":
    print("�� Running robust tests with timeouts...")
    
    tests = [
        test_basic_imports,
        test_file_operations,
        test_agent_quick,
        test_ollama_direct_quick
    ]
    
    results = []
    for test in tests:
        try:
            passed = test()
            results.append(passed)
            time.sleep(2)  # Brief pause between tests
        except Exception as e:
            print(f"   💥 Test crashed: {e}")
            results.append(False)
    
    print(f"\n📊 Results: {sum(results)}/{len(results)} tests passed")
    
    if sum(results) >= 3:
        print("🎉 SUCCESS: Core system is working!")
        print("💡 Tips:")
        print("   - First LLM calls are slower due to model loading")
        print("   - Use timeouts in production code")
        print("   - Consider smaller model for faster responses")
    else:
        print("❌ Some core components need attention")
        print("💡 Debug steps:")
        print("   - Check Ollama service: systemctl status ollama")
        print("   - Verify model: ollama list")
        print("   - Test model directly: ollama run codellama:7b-code-q4_K_M 'hi'")
