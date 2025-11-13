import psutil
import gc
import logging
from src.agent.graph import CodeAssistantAgent

class AgentManager:
    def __init__(self, max_memory_gb=16):
        self.agent = None
        self.max_memory_bytes = max_memory_gb * 1024 * 1024 * 1024
        self.logger = self._setup_logging()

    def _setup_logging(self):
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('agent.log'),
                logging.StreamHandler()
            ]
        )
        return logging.getLogger(__name__)

    def initialize_agent(self, model_name="codellama:7b-code-q4_K_M"):
        """Initialize the agent with memory management."""
        self.check_memory()
        self.agent = CodeAssistantAgent(model_name)
        self.logger.info(f"Agent initialized with model: {model_name}")
        return self.agent

    def check_memory(self):
        """Check system memory and clear cache if needed."""
        memory = psutil.virtual_memory()
        if memory.used > self.max_memory_bytes:
            self.logger.warning("High memory usage detected, clearing cache")
            gc.collect()

    def process_query(self, query: str):
        """Process a user query with error handling."""
        if not self.agent:
            self.initialize_agent()
        
        try:
            self.check_memory()
            response = self.agent.invoke(query)
            self.logger.info(f"Processed query: {query[:50]}...")
            return response
        except Exception as e:
            self.logger.error(f"Error processing query: {str(e)}")
            return f"Error: {str(e)}"
