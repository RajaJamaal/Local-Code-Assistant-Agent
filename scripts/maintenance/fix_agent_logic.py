#!/usr/bin/env python3
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
agent_path = PROJECT_ROOT / 'src/agent/simple_agent_improved.py'

# Read the current agent
with open(agent_path, 'r') as f:
    content = f.read()

# Fix the import at the top
content = content.replace(
    'from src.tools.file_tools import tools',
    'from ..tools.file_tools import tools'
)

# Fix the filename extraction in _handle_file_creation
old_extraction = '''
            # Extract filename - improved pattern
            if "called" in query.lower():
                parts = query.lower().split("called")[1].strip()
                filename = parts.split()[0].strip(' .",')
            elif "named" in query.lower():
                parts = query.lower().split("named")[1].strip()
                filename = parts.split()[0].strip(' .",')
            elif "create" in query.lower() and "file" in query.lower():
                # Try to extract filename after "file"
                parts = query.lower().split("file")[1].strip()
                if "with" in parts:
                    filename = parts.split("with")[0].strip()
                else:
                    filename = parts.split()[0].strip(' .",')'''

new_extraction = '''
            # Extract filename - ROBUST pattern
            query_lower = query.lower()
            
            # Pattern 1: "create file [filename] with content"
            if "create file" in query_lower:
                parts = query_lower.split("create file")[1].strip()
                if "with content" in parts:
                    filename = parts.split("with content")[0].strip()
                elif "with" in parts:
                    filename = parts.split("with")[0].strip()
                else:
                    filename = parts
            # Pattern 2: "create a file called [filename]"
            elif "called" in query_lower:
                parts = query_lower.split("called")[1].strip()
                if "with content" in parts:
                    filename = parts.split("with content")[0].strip()
                else:
                    filename = parts.split()[0]
            else:
                # Fallback: try to find the first word after "file"
                if "file" in query_lower:
                    parts = query_lower.split("file")[1].strip()
                    filename = parts.split()[0] if parts.split() else "output.txt"
                else:
                    filename = "output.txt"'''

content = content.replace(old_extraction, new_extraction)

# Fix the read file extraction
old_read_extract = '''
    def _extract_filename(self, query: str) -> str:
        """Extract filename from query."""
        words = query.lower().split()
        for i, word in enumerate(words):
            if word in ['file', 'read'] and i + 1 < len(words):
                return words[i + 1].strip('",.')
        return ""'''

new_read_extract = '''
    def _extract_filename(self, query: str) -> str:
        """Extract filename from query."""
        query_lower = query.lower()
        if "read file" in query_lower:
            # Get everything after "read file"
            filename = query_lower.split("read file")[1].strip()
            # Remove any trailing punctuation or common words
            if " " in filename:
                filename = filename.split()[0]
            return filename.strip('",.')
        return ""'''

content = content.replace(old_read_extract, new_read_extract)

# Write the fixed content
with open(agent_path, 'w') as f:
    f.write(content)

print("✅ Fixed agent logic and imports")
