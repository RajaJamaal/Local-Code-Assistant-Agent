#!/usr/bin/env python3
print("=== Testing Basic Setup ===")

import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

try:
    print("1. Testing imports...")
    from utils.security import SecurityValidator
    from tools.file_tools import tools
    print("   ✅ All imports successful!")
    
    print(f"2. Found {len(tools)} tools:")
    for tool in tools:
        print(f"   ✅ {tool.name}")
    
    print("3. Testing security validator...")
    test_result = SecurityValidator.validate_file_path("./test.py")
    print(f"   ✅ Security test: {test_result}")
    
    print("4. Testing Ollama connection...")
    try:
        from langchain_community.chat_models import ChatOllama
        llm = ChatOllama(model="codellama:7b-code-q4_K_M", temperature=0.1)
        print("   ✅ Ollama connection successful!")
    except Exception as e:
        print(f"   ❌ Ollama error: {e}")
        
    print("\n🎉 Basic setup completed successfully!")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you've activated the virtual environment: source .venv/bin/activate")
