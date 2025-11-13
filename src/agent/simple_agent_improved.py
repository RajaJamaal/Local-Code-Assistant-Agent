"""
Improved agent with better command recognition
"""
import os
import re
from src.tools.file_tools import tools

class ImprovedCodeAssistant:
    def __init__(self):
        self.tools = {tool.name: tool for tool in tools}
    
    def process_query(self, query: str) -> str:
        """Process a user query using improved pattern matching."""
        print(f"🤖 Processing: {query}")
        
        query_lower = query.lower()
        
        # Improved pattern matching
        if any(word in query_lower for word in ['create', 'write', 'make']) and 'file' in query_lower:
            return self._handle_file_creation(query)
        elif any(word in query_lower for word in ['list', 'show', 'ls', 'directory', 'folder', 'files']):
            return self.tools["list_directory"].invoke({})
        elif 'read file' in query_lower:
            filename = self._extract_filename(query)
            if filename:
                return self.tools["read_file"].invoke({"file_path": filename})
            else:
                return "Please specify which file to read."
        else:
            return "I can help with: creating files, listing directories, reading files. Try: 'Create a file called example.py with content print(\\'hello\\')'"

    def _handle_file_creation(self, query: str) -> str:
        """Handle file creation with improved parsing."""
        try:
            # Default values
            filename = "output.txt"
            content = "File created by AI assistant"
            
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
                    filename = parts.split()[0].strip(' .",')
            
            # Extract content  
            if "with content" in query.lower():
                content_part = query.lower().split("with content")[1].strip()
                content = content_part.strip('"')
            elif "containing" in query.lower():
                content_part = query.lower().split("containing")[1].strip()
                content = content_part.strip('"')
            
            # Clean filename but preserve extensions
            filename = re.sub(r'[^\w\-_.]', '_', filename)
            
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
                return words[i + 1].strip('",.')
        return ""

def run_improved_agent(query: str) -> str:
    """Run the improved agent with a query."""
    agent = ImprovedCodeAssistant()
    return agent.process_query(query)

if __name__ == "__main__":
    # Test the improved agent
    test_queries = [
        "Create a file called hello_world.txt with content Hello World!",
        "List the current directory",
        "Create a Python file called example.py with content print('Hello from Python')",
        "Read file hello_world.txt"
    ]
    
    for query in test_queries:
        print(f"\n🎯 Testing: {query}")
        result = run_improved_agent(query)
        print(f"📝 Result: {result}")
        print("-" * 50)
