#!/usr/bin/env python3
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

def fix_file_imports(filepath: Path):
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
    PROJECT_ROOT / 'src/tools/file_tools.py',
    PROJECT_ROOT / 'src/agent/simple_agent_improved.py',
    PROJECT_ROOT / 'src/agent/simple_agent.py'
]

for file in python_files:
    if file.exists():
        fix_file_imports(file)
    else:
        print(f"⚠️  File not found: {file}")

print("🎉 Import fixes completed!")
