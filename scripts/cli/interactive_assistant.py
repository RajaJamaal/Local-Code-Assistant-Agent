#!/usr/bin/env python3
import sys
import os
from pathlib import Path

# Ensure the project root (and src package) is importable
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.agent.simple_agent_improved import run_improved_agent

print("🤖 AI Code Assistant - Interactive Mode")
print("=" * 50)
print("Available commands:")
print("- Create files: 'Create a file called [name] with content [text]'")
print("- List directory: 'List files', 'Show directory'") 
print("- Read files: 'Read file [filename]'")
print("- Type 'quit' to exit")
print("=" * 50)

while True:
    try:
        user_input = input("\nYou: ").strip()
        
        if user_input.lower() in ['quit', 'exit', 'bye']:
            print("Assistant: Goodbye! 👋")
            break
        
        if not user_input:
            continue
            
        response = run_improved_agent(user_input)
        print(f"Assistant: {response}")
        
    except KeyboardInterrupt:
        print("\n\nAssistant: Session ended. Goodbye! 👋")
        break
    except Exception as e:
        print(f"Assistant: Error - {e}")

# Show created files
print("\n📁 Files in current directory:")
try:
    files = os.listdir('.')
    for file in files:
        if file.endswith(('.txt', '.py', '.md')):
            print(f"  - {file}")
except:
    pass
