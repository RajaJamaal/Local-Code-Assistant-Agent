#!/usr/bin/env python3
import os

def create_file_tools():
    content = '''import os
import subprocess
from typing import List
from langchain_core.tools import tool
from src.utils.security import SecurityValidator

@tool
def read_file(file_path: str) -> str:
    """Reads and returns the content of a file with security validation."""
    if not SecurityValidator.validate_file_path(file_path):
        return "Error: Invalid file path or security violation detected."
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return f"Error: File '{file_path}' not found."
    except PermissionError:
        return f"Error: Permission denied reading '{file_path}'."
    except Exception as e:
        return f"Error reading file: {str(e)}"

@tool
def write_file(file_path: str, content: str) -> str:
    """Writes content to a file with security validation."""
    if not SecurityValidator.validate_file_path(file_path):
        return "Error: Invalid file path or security violation detected."
    
    try:
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return f"Successfully wrote to '{file_path}'"
    except Exception as e:
        return f"Error writing file: {str(e)}"

@tool
def list_directory(directory_path: str = ".") -> str:
    """Lists contents of a directory with security validation."""
    if not SecurityValidator.validate_file_path(directory_path):
        return "Error: Invalid directory path or security violation detected."
    
    try:
        items = os.listdir(directory_path)
        return f"Directory '{directory_path}':\\n" + "\\n".join(items)
    except FileNotFoundError:
        return f"Error: Directory '{directory_path}' not found."
    except PermissionError:
        return f"Error: Permission denied accessing '{directory_path}'."
    except Exception as e:
        return f"Error listing directory: {str(e)}"

@tool
def execute_command(command: str, timeout: int = 30) -> str:
    """Executes a shell command with security validation and timeout."""
    # Basic command validation
    blocked_commands = ['rm -rf', 'format', 'dd', 'mkfs', 'shutdown', 'reboot']
    if any(blocked in command.lower() for blocked in blocked_commands):
        return "Error: Command blocked for security reasons."
    
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            capture_output=True, 
            text=True, 
            timeout=timeout,
            cwd=os.getcwd()  # Restrict to current directory
        )
        if result.returncode == 0:
            return f"Command executed successfully:\\n{result.stdout}"
        else:
            return f"Command failed (exit code {result.returncode}):\\n{result.stderr}"
    except subprocess.TimeoutExpired:
        return f"Error: Command timed out after {timeout} seconds."
    except Exception as e:
        return f"Error executing command: {str(e)}"

tools = [read_file, write_file, list_directory, execute_command]
'''
    
    os.makedirs('src/tools', exist_ok=True)
    with open('src/tools/file_tools.py', 'w') as f:
        f.write(content)
    print("✅ Created src/tools/file_tools.py")

def create_security():
    content = '''import re
import os
from pathlib import Path

class SecurityValidator:
    @staticmethod
    def validate_file_path(path: str) -> bool:
        """Validate file path to prevent directory traversal attacks."""
        try:
            if not path or not isinstance(path, str):
                return False
                
            # Resolve absolute path
            absolute_path = os.path.abspath(path)
            current_dir = os.path.abspath(os.getcwd())
            
            # Prevent path traversal outside current directory
            if not absolute_path.startswith(current_dir):
                return False
            
            # Block sensitive directories and patterns
            blocked_patterns = [
                r'/\\.git/', r'/\\.vscode/', r'/node_modules/',
                r'/etc/', r'/boot/', r'/sys/', r'/proc/', r'/dev/',
                r'\\.\\./', r'~/', r'/root/', r'/var/log/'
            ]
            
            for pattern in blocked_patterns:
                if re.search(pattern, absolute_path):
                    return False
            
            return True
            
        except Exception:
            return False

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename to prevent path injection."""
        # Remove path components and keep only filename
        basename = os.path.basename(filename)
        # Replace dangerous characters
        sanitized = re.sub(r'[^\\w\\-_. ]', '_', basename)
        return sanitized[:255]  # Limit length

    @staticmethod
    def validate_command(command: str) -> bool:
        """Validate shell command for security."""
        blocked_commands = [
            'rm -rf', 'format', 'dd', 'mkfs', 'shutdown', 'reboot',
            'passwd', 'chmod 777', 'wget', 'curl | bash'
        ]
        
        command_lower = command.lower()
        return not any(blocked in command_lower for blocked in blocked_commands)
'''
    
    os.makedirs('src/utils', exist_ok=True)
    with open('src/utils/security.py', 'w') as f:
        f.write(content)
    print("✅ Created src/utils/security.py")

def create_simple_agent():
    content = '''"""
Simple agent that uses direct tool execution without LLM delays
"""
import os
import re
from src.tools.file_tools import tools

class SimpleCodeAssistant:
    def __init__(self):
        self.tools = {tool.name: tool for tool in tools}
    
    def process_query(self, query: str) -> str:
        """Process a user query using direct pattern matching (no LLM)."""
        print(f"🤖 Processing: {query}")
        
        query_lower = query.lower()
        
        # Direct pattern matching for common operations
        if "create a file" in query_lower or "write a file" in query_lower:
            return self._handle_file_creation(query)
        elif "list directory" in query_lower or "show files" in query_lower:
            return self.tools["list_directory"].invoke({})
        elif "read file" in query_lower:
            filename = self._extract_filename(query)
            if filename:
                return self.tools["read_file"].invoke({"file_path": filename})
            else:
                return "Please specify which file to read."
        else:
            return "I can help with file operations. Try: 'Create a file called test.txt with content Hello'"

    def _handle_file_creation(self, query: str) -> str:
        """Handle file creation with robust parsing."""
        try:
            # Default values
            filename = "output.txt"
            content = "File created by AI assistant"
            
            # Extract filename
            if "called" in query.lower():
                parts = query.lower().split("called")[1].strip()
                filename = parts.split()[0].strip(' ."\\',')
            elif "named" in query.lower():
                parts = query.lower().split("named")[1].strip()
                filename = parts.split()[0].strip(' ."\\',')
            
            # Extract content  
            if "with content" in query.lower():
                content_part = query.lower().split("with content")[1].strip()
                content = content_part.strip('"\\'').split('.')[0]  # Take first sentence
            elif "containing" in query.lower():
                content_part = query.lower().split("containing")[1].strip()
                content = content_part.strip('"\\'').split('.')[0]
            
            # Clean filename
            filename = re.sub(r'[^\\w\\-_.]', '_', filename)
            if not filename.endswith('.txt'):
                filename += '.txt'
            
            print(f"📝 Creating file: {filename} with content: {content}")
            
            # Use the file tool
            result = self.tools["write_file"].invoke({
                "file_path": filename,
                "content": content
            })
            
            return f"✅ {result}"
            
        except Exception as e:
            return f"❌ Error creating file: {str(e)}"
    
    def _extract_filename(self, query: str) -> str:
        """Extract filename from query."""
        words = query.lower().split()
        for i, word in enumerate(words):
            if word in ['file', 'read'] and i + 1 < len(words):
                return words[i + 1].strip('"\\',.')
        return ""

def run_simple_agent(query: str) -> str:
    """Run the simple agent with a query."""
    agent = SimpleCodeAssistant()
    return agent.process_query(query)

if __name__ == "__main__":
    # Test the agent
    test_query = "Create a file called test_simple.txt with content Hello from Simple Agent"
    print(f"🎯 Testing: {test_query}")
    result = run_simple_agent(test_query)
    print(f"📝 Result: {result}")
    
    if os.path.exists("test_simple.txt"):
        with open("test_simple.txt", "r") as f:
            print(f"📄 File content: '{f.read()}'")
'''
    
    os.makedirs('src/agent', exist_ok=True)
    with open('src/agent/simple_agent.py', 'w') as f:
        f.write(content)
    print("✅ Created src/agent/simple_agent.py")

if __name__ == "__main__":
    create_file_tools()
    create_security()
    create_simple_agent()
    print("🎉 All files created successfully!")
