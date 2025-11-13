import os
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
    """Writes content to a file with security validation and directory creation."""
    if not SecurityValidator.validate_file_path(file_path):
        return "Error: Invalid file path or security violation detected."
    
    try:
        safe_path = SecurityValidator.sanitize_filename(file_path)
        os.makedirs(os.path.dirname(safe_path), exist_ok=True)
        
        with open(safe_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return f"Successfully wrote to {safe_path}"
    except Exception as e:
        return f"Error writing file: {str(e)}"

@tool
def list_directory(directory_path: str = ".") -> List[str]:
    """Lists files and directories in the specified path."""
    if not SecurityValidator.validate_file_path(directory_path):
        return ["Error: Invalid directory path."]
    
    try:
        items = os.listdir(directory_path)
        result = []
        for item in items:
            full_path = os.path.join(directory_path, item)
            if os.path.isdir(full_path):
                result.append(f"📁 {item}/")
            else:
                result.append(f"📄 {item}")
        return result
    except Exception as e:
        return [f"Error listing directory: {str(e)}"]

@tool
def execute_command(command: str) -> str:
    """Executes a shell command with security validation and timeout."""
    if not SecurityValidator.validate_command(command):
        return "Error: Command rejected due to security policy."
    
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30,
            cwd=os.getcwd()
        )
        output = f"Exit code: {result.returncode}\n"
        if result.stdout:
            output += f"STDOUT:\n{result.stdout}\n"
        if result.stderr:
            output += f"STDERR:\n{result.stderr}\n"
        return output
    except subprocess.TimeoutExpired:
        return "Error: Command timed out after 30 seconds."
    except Exception as e:
        return f"Error executing command: {str(e)}"

# Export all tools
tools = [read_file, write_file, list_directory, execute_command]
