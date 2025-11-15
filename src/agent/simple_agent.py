"""
Simple agent that uses direct tool execution without LLM delays
"""
import os
import re
from ..tools.file_tools import tools

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
                filename = parts.split()[0].strip(' ."\',')
            elif "named" in query.lower():
                parts = query.lower().split("named")[1].strip()
                filename = parts.split()[0].strip(' ."\',')
            
            # Extract content  
            if "with content" in query.lower():
                content_part = query.lower().split("with content")[1].strip()
                content = content_part.strip('"\'').split('.')[0]  # Take first sentence
            elif "containing" in query.lower():
                content_part = query.lower().split("containing")[1].strip()
                content = content_part.strip('"\'').split('.')[0]
            
            # Clean filename
            filename = re.sub(r'[^\w\-_.]', '_', filename)
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
                return words[i + 1].strip('"\',.')
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
