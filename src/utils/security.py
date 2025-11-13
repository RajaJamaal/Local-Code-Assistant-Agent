import re
import os
from pathlib import Path

class SecurityValidator:
    @staticmethod
    def validate_file_path(path: str) -> bool:
        """Validate file path to prevent directory traversal attacks."""
        try:
            if not path or not isinstance(path, str):
                return False
                
            absolute_path = os.path.abspath(path)
            current_dir = os.path.abspath(os.getcwd())
            
            # Prevent path traversal
            if not absolute_path.startswith(current_dir):
                return False
            
            # Block sensitive directories
            blocked_patterns = [
                r'/\.git/', r'/\.vscode/', r'/node_modules/',
                r'/etc/', r'/boot/', r'/sys/', r'/proc/', r'/dev/'
            ]
            
            path_str = str(Path(absolute_path))
            return not any(re.search(pattern, path_str) for pattern in blocked_patterns)
            
        except Exception:
            return False

    @staticmethod
    def validate_command(cmd: str) -> bool:
        """Validate shell commands for security."""
        if not cmd or not isinstance(cmd, str):
            return False
            
        blocked_patterns = [
            r'rm\s+-rf', r'mkfs', r'dd\s+if=',
            r'chmod\s+777', r'chown\s+', r'passwd',
            r'ssh-keygen', r'format\s+', r'fdisk',
            r'>\s+/dev/', r'curl\s+.*\|\s*sh',
            r'wget\s+.*\|\s*sh'
        ]
        return not any(re.search(pattern, cmd, re.IGNORECASE) for pattern in blocked_patterns)

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename to prevent path injection."""
        if not filename:
            return "untitled"
        return re.sub(r'[^\w\-_. ]', '_', filename)
