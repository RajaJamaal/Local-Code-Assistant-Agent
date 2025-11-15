#!/usr/bin/env python3
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.getcwd())

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
