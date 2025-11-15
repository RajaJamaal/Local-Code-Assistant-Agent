#!/usr/bin/env python3
"""
Main entry point for Local AI Code Assistant
"""
import os
import sys
import argparse

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def main():
    parser = argparse.ArgumentParser(description="Local AI Code Assistant")
    parser.add_argument("command", nargs="?", help="Command to execute")
    parser.add_argument("--interactive", "-i", action="store_true", help="Interactive mode")
    parser.add_argument("--model", default="codellama:7b-code-q4_K_M", help="Ollama model to use")
    
    args = parser.parse_args()
    
    try:
        from src.agent.simple_agent_improved import run_improved_agent
        
        if args.interactive or not args.command:
            run_interactive_mode()
        else:
            result = run_improved_agent(args.command)
            print(f"🤖 Result: {result}")
            
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("💡 Make sure all dependencies are installed and paths are correct")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

def run_interactive_mode():
    """Run the assistant in interactive mode."""
    from src.agent.simple_agent_improved import run_improved_agent
    
    print("🤖 Local AI Code Assistant - Interactive Mode")
    print("=" * 60)
    print("Commands:")
    print("  • Create files: 'Create file [name] with content [text]'")
    print("  • List directory: 'list files', 'show directory'")
    print("  • Read files: 'read file [filename]'")
    print("  • Type 'quit' or 'exit' to end session")
    print("=" * 60)
    
    while True:
        try:
            user_input = input("\n💬 You: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'bye']:
                print("👋 Goodbye!")
                break
                
            if not user_input:
                continue
                
            result = run_improved_agent(user_input)
            print(f"🤖 Assistant: {result}")
            
        except KeyboardInterrupt:
            print("\n\n👋 Session ended by user")
            break
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
