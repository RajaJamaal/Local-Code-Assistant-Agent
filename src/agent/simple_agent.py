"""
Simple working agent without complex dependencies
"""
import os
import time
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage
from src.tools.file_tools import tools

class SimpleCodeAssistant:
    def __init__(self, model_name="codellama:7b-code-q4_K_M"):
        self.model_name = model_name
        self.llm = ChatOllama(
            model=model_name,
            temperature=0.1,
            num_ctx=4096,
            timeout=60  # Add timeout
        )
        self.tools = {tool.name: tool for tool in tools}
        
        # System prompt
        self.system_prompt = """You are a helpful coding assistant. You have access to these tools:
        - read_file: Read files
        - write_file: Create or modify files  
        - list_directory: List directory contents
        - execute_command: Run shell commands
        
        Always think step by step and use tools when needed."""
    
    def process_query(self, query: str) -> str:
        """Process a user query with tool usage."""
        print(f"🤖 Processing: {query}")
        
        try:
            # First, analyze the query
            analysis = self._analyze_query(query)
            print(f"🔍 Analysis: {analysis}")
            
            # Execute based on analysis
            if analysis["needs_tool"]:
                return self._execute_with_tools(query, analysis)
            else:
                return self._get_direct_response(query)
                
        except Exception as e:
            return f"❌ Error processing query: {str(e)}"
    
    def _analyze_query(self, query: str) -> dict:
        """Analyze what the query needs."""
        query_lower = query.lower()
        
        needs_tool = any(keyword in query_lower for keyword in [
            'create', 'write', 'make', 'read', 'list', 'show', 'run', 'execute',
            'file', 'directory', 'folder', 'command', 'terminal'
        ])
        
        return {
            "needs_tool": needs_tool,
            "query_type": "file_operation" if any(word in query_lower for word in ['file', 'directory']) else "general"
        }
    
    def _execute_with_tools(self, query: str, analysis: dict) -> str:
        """Execute query using available tools."""
        
        # Simple pattern matching for common operations
        if "create a file" in query.lower() or "write a file" in query.lower():
            return self._handle_file_creation(query)
        elif "list directory" in query.lower() or "show files" in query.lower():
            return self.tools["list_directory"].invoke({})
        elif "read file" in query.lower():
            # Extract filename from query
            filename = self._extract_filename(query)
            if filename:
                return self.tools["read_file"].invoke({"file_path": filename})
            else:
                return "Please specify which file to read."
        else:
            # Fallback to LLM response
            return self._get_direct_response(query)
    
    def _handle_file_creation(self, query: str) -> str:
        """Handle file creation requests with simple parsing."""
        try:
            # Extract filename and content
            if "called" in query:
                parts = query.split("called")[1].strip()
                if "with content" in parts:
                    filename = parts.split("with content")[0].strip()
                    content = parts.split("with content")[1].strip()
                else:
                    filename = parts.split()[0]
                    content = "Default content created by AI assistant"
            else:
                filename = "output.txt"
                content = "Default content created by AI assistant"
            
            # Clean filename
            filename = filename.replace('"', '').replace("'", "").split()[0]
            if not filename.endswith('.txt'):
                filename += '.txt'
            
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
                return words[i + 1].strip('"\'')
        return ""
    
    def _get_direct_response(self, query: str) -> str:
        """Get direct LLM response without tools."""
        try:
            messages = [
                SystemMessage(content=self.system_prompt),
                HumanMessage(content=query)
            ]
            
            response = self.llm.invoke(messages)
            return response.content
            
        except Exception as e:
            return f"❌ LLM Error: {str(e)}"

def run_simple_agent(query: str) -> str:
    """Run the simple agent with a query."""
    agent = SimpleCodeAssistant()
    return agent.process_query(query)

if __name__ == "__main__":
    # Test the agent
    test_queries = [
        "Create a file called test_simple.txt with content Hello from Simple Agent",
        "List the current directory",
        "What is Python?"
    ]
    
    for query in test_queries:
        print(f"\n🎯 Query: {query}")
        result = run_simple_agent(query)
        print(f"📝 Result: {result}")
        print("-" * 50)
