#!/usr/bin/env python3
print("=== Testing Basic Setup with New Packages ===")

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
    print("1. Testing new ChatOllama import...")
    from langchain_ollama import ChatOllama
    print("   ✅ New ChatOllama imported successfully!")
    
    print("2. Testing tools import...")
    from tools.file_tools import tools
    print(f"   ✅ Tools imported: {len(tools)} tools")
    
    print("3. Testing Ollama connection...")
    llm = ChatOllama(model="codellama:7b-code-q4_K_M", temperature=0.1)
    test_response = llm.invoke("Say just 'Hello'")
    print(f"   ✅ Ollama working: {test_response.content}")
    
    print("4. Testing simple file operations...")
    from tools.file_tools import write_file, read_file
    
    # Test writing a file
    write_result = write_file.invoke({"file_path": "test_basic.txt", "content": "Test content"})
    print(f"   ✅ Write file test: {write_result}")
    
    # Test reading the file
    read_result = read_file.invoke({"file_path": "test_basic.txt"})
    print(f"   ✅ Read file test: {read_result}")
    
    # Clean up
    if os.path.exists("test_basic.txt"):
        os.remove("test_basic.txt")
        print("   🧹 Test file cleaned up")
    
    print("\n🎉 All basic components working perfectly!")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
except Exception as e:
    print(f"❌ Other error: {e}")
    import traceback
    traceback.print_exc()
