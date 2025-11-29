import psutil
import gc
import logging
from src.agent.graph import CodeAssistantAgent

class AgentManager:
    def __init__(self, max_memory_gb=16):
        self.agent = None
        self.max_memory_bytes = max_memory_gb * 1024 * 1024 * 1024
        self.logger = self._setup_logging()
        self.model_name = None
        self.temperature = None

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

    def initialize_agent(self, model_name="phi4-mini:3.8b", temperature: float = 0.1):
        """Initialize the agent with memory management."""
        self.check_memory()
        self.agent = CodeAssistantAgent(model_name, temperature=temperature)
        self.model_name = model_name
        self.temperature = temperature
        self.logger.info(f"Agent initialized with model: {model_name} (temp={temperature})")
        return self.agent

    def check_memory(self):
        """Check system memory and clear cache if needed."""
        memory = psutil.virtual_memory()
        if memory.used > self.max_memory_bytes:
            self.logger.warning("High memory usage detected, clearing cache")
            gc.collect()

    def process_query(self, query: str, context: str | None = None, model_name: str | None = None, temperature: float | None = None):
        """Process a user query with error handling."""
        desired_model = model_name or self.model_name or "phi4-mini:3.8b"
        desired_temp = temperature if temperature is not None else (self.temperature or 0.1)
        if not self.agent or desired_model != self.model_name or desired_temp != self.temperature:
            self.initialize_agent(model_name=desired_model, temperature=desired_temp)
        
        try:
            self.check_memory()
            response = self.agent.invoke(query, context=context)
            self.logger.info(f"Processed query: {query[:50]}...")
            return response
        except Exception as e:
            self.logger.error(f"Error processing query: {str(e)}")
            return f"Error: {str(e)}"
