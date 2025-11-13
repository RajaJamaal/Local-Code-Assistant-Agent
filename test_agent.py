#!/usr/bin/env python3
print("=== Testing LangGraph Agent ===")

import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

try:
    print("1. Testing agent imports...")
    from agent.graph import run_agent
    print("   ✅ Agent imports successful!")
    
    print("2. Testing simple agent query...")
    test_query = "Create a Python file called 'hello_test.py' that prints 'Hello from the agent!'"
    response = run_agent(test_query)
    print(f"   ✅ Agent response received: {len(response)} characters")
    print(f"   📝 Response preview: {response[:200]}...")
    
    print("3. Checking if file was created...")
    if os.path.exists("hello_test.py"):
        print("   ✅ File created successfully!")
        with open("hello_test.py", "r") as f:
            content = f.read()
            print(f"   📄 File content:\n{content}")
    else:
        print("   ❌ File not created - agent may need adjustment")
    
    print("\n🎉 Agent test completed!")

except ImportError as e:
    print(f"❌ Import error: {e}")
    print("This might be due to version conflicts. Let's fix them...")
    
    # Try to fix dependencies
    try:
        import subprocess
        print("Attempting to fix dependencies...")
        subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", "langchain-community"], check=True)
        print("Please run the test again.")
    except Exception as fix_error:
        print(f"Failed to fix dependencies: {fix_error}")
