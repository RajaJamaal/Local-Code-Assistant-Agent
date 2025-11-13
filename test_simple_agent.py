#!/usr/bin/env python3
print("=== Testing Simple Agent ===")

import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

try:
    print("1. Importing simple agent...")
    from agent.simple_agent import run_simple_agent
    print("   ✅ Simple agent imported!")
    
    print("2. Testing file creation...")
    test_query = "Create a file called test_agent.txt with content Hello from Simple Agent"
    result = run_simple_agent(test_query)
    print(f"   ✅ Agent response: {result}")
    
    print("3. Checking if file was created...")
    if os.path.exists("test_agent.txt"):
        with open("test_agent.txt", "r") as f:
            content = f.read()
            print(f"   📄 File content: '{content}'")
        # Clean up
        os.remove("test_agent.txt")
        print("   🧹 Test file cleaned up")
    else:
        print("   ℹ️  File not created - agent logic might need adjustment")
    
    print("\n🎉 Simple agent test completed!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
