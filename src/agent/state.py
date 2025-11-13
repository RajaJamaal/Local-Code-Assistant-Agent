from typing import Annotated, TypedDict, List
import operator

class AgentState(TypedDict):
    """State management for the LangGraph agent."""
    messages: Annotated[List, operator.add]
    current_step: str
    error_count: int
    last_tool_used: str

class ToolExecutor:
    """Enhanced tool executor with error handling."""
    def __init__(self, tools):
        self.tools = {tool.name: tool for tool in tools}
    
    def execute(self, tool_name: str, tool_input: dict) -> str:
        try:
            if tool_name in self.tools:
                return self.tools[tool_name].invoke(tool_input)
            else:
                return f"Error: Tool '{tool_name}' not found."
        except Exception as e:
            return f"Error executing tool {tool_name}: {str(e)}"
    
    def batch(self, tool_calls) -> List[str]:
        results = []
        for tool_call in tool_calls:
            result = self.execute(tool_call["name"], tool_call["args"])
            results.append(result)
        return results
