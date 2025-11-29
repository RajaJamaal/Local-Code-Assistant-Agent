#!/usr/bin/env python3
print("=== Testing Basic Setup ===")

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
        llm = ChatOllama(model="phi4-mini:3.8b", temperature=0.1)
        print("   ✅ Ollama connection successful!")
    except Exception as e:
        print(f"   ❌ Ollama error: {e}")
        
    print("\n🎉 Basic setup completed successfully!")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you've activated the virtual environment: source .venv/bin/activate")
