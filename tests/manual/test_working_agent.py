#!/usr/bin/env python3
print("=== Testing Working Agent ===")

import sys
import os
from pathlib import Path

# Add src to path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
SRC_PATH = PROJECT_ROOT / 'src'
if str(SRC_PATH) not in sys.path:
    sys.path.append(str(SRC_PATH))
os.chdir(PROJECT_ROOT)

try:
    print("1. Testing agent creation...")
    from agent.graph import CodeAssistantAgent
    
    print("2. Creating agent instance...")
    agent = CodeAssistantAgent("codellama:7b-code-q4_K_M")
    print("   ✅ Agent created successfully!")
    
    print("3. Testing simple agent query...")
    # First test without tools to see if basic LLM works
    from langchain_community.chat_models import ChatOllama
    llm = ChatOllama(model="codellama:7b-code-q4_K_M", temperature=0.1)
    simple_response = llm.invoke("Write a one-line Python function that returns 'hello world'")
    print(f"   ✅ Basic LLM response: {simple_response.content[:100]}...")
    
    print("4. Testing agent with simple file creation...")
    test_query = "Please create a file called test_simple.txt with the content 'Hello from agent test'"
    
    print("   Sending query to agent...")
    response = agent.invoke(test_query)
    print(f"   Agent response length: {len(response)} characters")
    print(f"   Response preview: {response[:200]}...")
    
    print("5. Checking if file was created...")
    if os.path.exists("test_simple.txt"):
        print("   ✅ File created successfully!")
        with open("test_simple.txt", "r") as f:
            content = f.read()
            print(f"   📄 File content: '{content}'")
        # Clean up
        os.remove("test_simple.txt")
        print("   🧹 Test file cleaned up")
    else:
        print("   ℹ️  File not created - agent may have responded differently")
    
    print("\n🎉 Agent test completed successfully!")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
