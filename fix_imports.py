#!/usr/bin/env python3
import os
import re

def fix_file_imports(filepath):
    """Fix import paths in a Python file."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Replace problematic imports
    replacements = {
        'from src.utils.security': 'from ..utils.security',
        'from src.tools.file_tools': 'from ..tools.file_tools', 
        'from tools.file_tools': 'from ..tools.file_tools',
        'from utils.security': 'from ..utils.security',
    }
    
    for old, new in replacements.items():
        content = content.replace(old, new)
    
    # Write fixed content
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"✅ Fixed imports in {filepath}")

# Fix all Python files
python_files = [
    'src/tools/file_tools.py',
    'src/agent/simple_agent_improved.py',
    'src/agent/simple_agent.py'
]

for file in python_files:
    if os.path.exists(file):
        fix_file_imports(file)
    else:
        print(f"⚠️  File not found: {file}")

print("🎉 Import fixes completed!")
