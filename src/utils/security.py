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
                
            # Resolve absolute path
            absolute_path = os.path.abspath(path)
            current_dir = os.path.abspath(os.getcwd())
            
            # Prevent path traversal outside current directory
            if not absolute_path.startswith(current_dir):
                return False
            
            # Block sensitive directories and patterns
            blocked_patterns = [
                r'/\.git/', r'/\.vscode/', r'/node_modules/',
                r'/etc/', r'/boot/', r'/sys/', r'/proc/', r'/dev/',
                r'\.\./', r'~/', r'/root/', r'/var/log/'
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
        sanitized = re.sub(r'[^\w\-_. ]', '_', basename)
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
