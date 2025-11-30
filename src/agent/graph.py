from langchain_ollama import ChatOllama
from langgraph.graph import StateGraph, END
from src.agent.state import AgentState, ToolExecutor
from src.tools.file_tools import tools

class CodeAssistantAgent:
    def __init__(self, model_name="phi4-mini:3.8b", temperature: float = 0.1):
        self.model_name = model_name
        self.temperature = temperature
        self.llm = self._initialize_llm()
        self.tool_executor = ToolExecutor(tools)
        self.graph = self._build_graph()

    def _initialize_llm(self):
        return ChatOllama(
            model=self.model_name,
            temperature=self.temperature,
            num_ctx=4096
        )

    def should_continue(self, state: AgentState) -> str:
        """Determine if the agent should continue using tools or end."""
        messages = state['messages']
        last_message = messages[-1]
        
        # End if no tool calls or too many errors
        if not hasattr(last_message, 'tool_calls') or not last_message.tool_calls:
            return "end"
        
        if state.get('error_count', 0) > 3:
            return "end"
            
        return "continue"

    def call_agent(self, state: AgentState):
        """Agent node that decides which tools to use."""
        messages = state['messages']
        response = self.llm.invoke(messages)
        
        # Update state
        return {
            "messages": [response],
            "current_step": "agent_decision"
        }

    def call_tools(self, state: AgentState):
        """Tool execution node."""
        messages = state['messages']
        last_message = messages[-1]
        
        # Execute tools
        responses = self.tool_executor.batch(last_message.tool_calls)
        
        # Create tool messages
        tool_messages = []
        for tool_call, response in zip(last_message.tool_calls, responses):
            tool_messages.append({
                "role": "tool",
                "content": str(response),
                "tool_call_id": tool_call["id"]
            })
        
        # Update error count
        error_count = state.get('error_count', 0)
        for response in responses:
            if "Error:" in str(response):
                error_count += 1

        last_tool_used = last_message.tool_calls[0]["name"] if last_message.tool_calls else "none"

        return {
            "messages": tool_messages,
            "error_count": error_count,
            "last_tool_used": last_tool_used
        }

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph state graph."""
        workflow = StateGraph(AgentState)
        
        # Add nodes
        workflow.add_node("agent", self.call_agent)
        workflow.add_node("tools", self.call_tools)
        
        # Set entry point
        workflow.set_entry_point("agent")
        
        # Add edges
        workflow.add_conditional_edges(
            "agent",
            self.should_continue,
            {
                "continue": "tools",
                "end": END
            }
        )
        
        workflow.add_edge("tools", "agent")
        
        return workflow.compile()

    def invoke(self, query: str, context: str | None = None):
        """Run the agent with a user query."""
        try:
            messages = []
            if context:
                messages.append({"role": "system", "content": context})
            messages.append({"role": "user", "content": query})
            result = self.graph.invoke({
                "messages": messages,
                "error_count": 0,
                "current_step": "start",
                "last_tool_used": "none"
            })
            return result['messages'][-1].content
        except Exception as e:
            return f"Agent execution error: {str(e)}"

# Simple function to run the agent
def run_agent(query: str, model_name="phi4-mini:3.8b", temperature: float = 0.1, context: str | None = None):
    """Convenience function to run the agent."""
    agent = CodeAssistantAgent(model_name, temperature=temperature)
    return agent.invoke(query, context=context)
