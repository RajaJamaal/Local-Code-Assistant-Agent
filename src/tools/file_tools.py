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
    """Writes content to a file with security validation."""
    if not SecurityValidator.validate_file_path(file_path):
        return "Error: Invalid file path or security violation detected."
    
    try:
        # Create directory if it doesn't exist - FIXED VERSION
        directory = os.path.dirname(file_path)
        if directory:  # Only create directories if path contains them
            os.makedirs(directory, exist_ok=True)
        
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
        return f"Directory '{directory_path}':\n" + "\n".join(items)
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
            return f"Command executed successfully:\n{result.stdout}"
        else:
            return f"Command failed (exit code {result.returncode}):\n{result.stderr}"
    except subprocess.TimeoutExpired:
        return f"Error: Command timed out after {timeout} seconds."
    except Exception as e:
        return f"Error executing command: {str(e)}"

tools = [read_file, write_file, list_directory, execute_command]
