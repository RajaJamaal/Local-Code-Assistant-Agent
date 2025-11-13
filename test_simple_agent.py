#!/usr/bin/env python3
print("=== Testing Simple Agent Setup ===")

import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

try:
    print("1. Testing basic imports...")
    from langchain_community.chat_models import ChatOllama
    from langgraph.graph import StateGraph, END
    print("   ✅ Basic imports successful!")
    
    print("2. Testing tools import...")
    from tools.file_tools import tools
    print(f"   ✅ Tools imported: {len(tools)} tools")
    
    print("3. Testing Ollama connection...")
    llm = ChatOllama(model="codellama:7b-code-q4_K_M", temperature=0.1)
    test_response = llm.invoke("Say 'Hello' in one word")
    print(f"   ✅ Ollama working: {test_response.content}")
    
    print("4. Testing agent state imports...")
    from agent.state import AgentState, ToolExecutor
    print("   ✅ Agent state imports successful!")
    
    print("5. Testing tool executor...")
    executor = ToolExecutor(tools)
    print("   ✅ Tool executor created!")
    
    print("\n🎉 All basic components working! Ready to build the full agent.")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
except Exception as e:
    print(f"❌ Other error: {e}")
