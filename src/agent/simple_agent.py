"""
Simple agent that uses tools without LangGraph complexity
"""
from langchain_ollama import ChatOllama
from src.tools.file_tools import tools
import json

class SimpleCodeAssistant:
    def __init__(self, model_name="codellama:7b-code-q4_K_M"):
        self.model_name = model_name
        self.llm = ChatOllama(
            model=model_name,
            temperature=0.1,
            num_ctx=4096
        )
        self.tools = {tool.name: tool for tool in tools}
    
    def execute_tool(self, tool_name: str, tool_input: dict) -> str:
        """Execute a single tool."""
        try:
            if tool_name in self.tools:
                return self.tools[tool_name].invoke(tool_input)
            return f"Error: Tool '{tool_name}' not found."
        except Exception as e:
            return f"Error executing {tool_name}: {str(e)}"
    
    def process_query(self, query: str) -> str:
        """Process a user query with manual tool usage."""
        print(f"🤖 Processing: {query}")
        
        # First, let the LLM think about what to do
        system_prompt = """You are a coding assistant. You have access to these tools:
        - read_file: Read file content
        - write_file: Write content to a file  
        - list_directory: List files in directory
        - execute_command: Run shell commands
        
        Think step by step and decide what actions to take."""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query}
        ]
        
        response = self.llm.invoke(messages)
        print(f"💭 LLM Response: {response.content}")
        
        # For now, let's handle simple file creation directly
        if "create" in query.lower() and "file" in query.lower():
            # Extract filename and content from query
            import re
            filename_match = re.search(r'(\w+\.\w+)', query)
            content_match = re.search(r'with (?:content|text) [\"\']?([^\"\']+)[\"\']?', query)
            
            if filename_match:
                filename = filename_match.group(1)
                content = content_match.group(1) if content_match else "Hello from the agent!"
                
                print(f"🛠️ Creating file: {filename} with content: {content}")
                result = self.execute_tool("write_file", {"file_path": filename, "content": content})
                return f"Attempted to create file. Result: {result}"
        
        return f"I received your request: '{query}'. Currently I can help create files with simple patterns."

def run_simple_agent(query: str, model_name="codellama:7b-code-q4_K_M"):
    """Convenience function to run the simple agent."""
    agent = SimpleCodeAssistant(model_name)
    return agent.process_query(query)

# Test the simple agent
if __name__ == "__main__":
    test_query = "Create a file called hello_simple.py with a function that says hello"
    result = run_simple_agent(test_query)
    print(f"Final result: {result}")
