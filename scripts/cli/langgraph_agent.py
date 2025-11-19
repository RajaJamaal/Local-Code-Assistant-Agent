#!/usr/bin/env python3
"""
Command-line interface for the LangGraph-powered coding agent.

Supports both LangGraph (LLM-powered) and simple heuristic backends so the tool
can run even when the local LLM isn't available yet.
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Callable

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

QueryRunner = Callable[[str], str]
USE_LANGGRAPH_MOCK = os.getenv("LANGGRAPH_AGENT_MOCK", "0") == "1"


def format_response(success: bool, message: str, json_output: bool) -> None:
    """Print response in either JSON or plain text."""
    if json_output:
        payload = {"success": success}
        key = "response" if success else "error"
        payload[key] = message
        print(json.dumps(payload))
    else:
        prefix = "✅" if success else "❌"
        print(f"{prefix} {message}")


def run_interactive(runner: QueryRunner, json_output: bool) -> None:
    """Interactive REPL loop for the agent."""
    print("🤖 Local Code Assistant (type 'exit' to quit)")
    while True:
        try:
            user_input = input("You> ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n👋 Session ended.")
            break

        if not user_input:
            continue
        if user_input.lower() in {"exit", "quit"}:
            print("👋 Goodbye!")
            break

        run_and_report(runner, user_input, json_output)


def run_and_report(runner: QueryRunner, query: str, json_output: bool) -> None:
    """Execute a single query and format the response."""
    try:
        response = runner(query)
        format_response(True, response, json_output)
    except Exception as exc:  # pragma: no cover - defensive logging
        format_response(False, f"Agent error: {exc}", json_output)


def create_runner(backend: str, model_name: str) -> QueryRunner:
    """Return a callable that executes queries using the requested backend."""
    if backend == "simple":
        return create_simple_runner()

    if USE_LANGGRAPH_MOCK:
        def mock_runner(query: str) -> str:
            return f"[Mock LangGraph response] {query}"
        return mock_runner

    from src.agent.manager import AgentManager  # Local import to avoid heavy deps during --help

    manager = AgentManager()
    manager.initialize_agent(model_name=model_name)

    def langgraph_runner(query: str) -> str:
        return manager.process_query(query)

    return langgraph_runner


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the local coding assistant (LangGraph or simple backend)."
    )
    parser.add_argument(
        "command",
        nargs="?",
        help="Single command to execute (omit for interactive mode)",
    )
    parser.add_argument(
        "--backend",
        choices=["langgraph", "simple"],
        default="langgraph",
        help="Select the backend: LangGraph (LLM) or the simple heuristic agent.",
    )
    parser.add_argument(
        "--model",
        default="codellama:7b-code-q4_K_M",
        help="Name of the local Ollama model to use (LangGraph backend only).",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Return responses as JSON (useful for editor integrations).",
    )
    parser.add_argument(
        "--interactive",
        "-i",
        action="store_true",
        help="Force interactive mode even if a command is provided.",
    )
    return parser.parse_args()


def create_simple_runner() -> QueryRunner:
    """Create a lightweight runner that does not require LangChain."""
    from src.utils.security import SecurityValidator

    def sanitize_path(path: str) -> str:
        return re.sub(r"[^\w\\-_.\\/]", "_", path)

    def read_file(path: str) -> str:
        if not SecurityValidator.validate_file_path(path):
            return "Error: Invalid file path."
        try:
            return Path(path).read_text(encoding="utf-8")
        except FileNotFoundError:
            return f"Error: File '{path}' not found."
        except PermissionError:
            return f"Error: Permission denied reading '{path}'."

    def write_file(path: str, content: str) -> str:
        if not SecurityValidator.validate_file_path(path):
            return "Error: Invalid file path."
        directory = os.path.dirname(path)
        if directory:
            os.makedirs(directory, exist_ok=True)
        Path(path).write_text(content, encoding="utf-8")
        return f"Successfully wrote to '{path}'"

    def list_directory(path: str = ".") -> str:
        if not SecurityValidator.validate_file_path(path):
            return "Error: Invalid directory."
        try:
            entries = os.listdir(path)
            return f"Directory '{path}':\n" + "\n".join(entries)
        except FileNotFoundError:
            return f"Error: Directory '{path}' not found."
        except PermissionError:
            return f"Error: Permission denied accessing '{path}'."

    def extract_filename(query: str) -> str:
        query_lower = query.lower()
        if "create file" in query_lower:
            segment = query_lower.split("create file", 1)[1].strip()
        elif "called" in query_lower:
            segment = query_lower.split("called", 1)[1].strip()
        elif "named" in query_lower:
            segment = query_lower.split("named", 1)[1].strip()
        elif "file" in query_lower:
            segment = query_lower.split("file", 1)[1].strip()
        else:
            return "output.txt"

        if "with content" in segment:
            segment = segment.split("with content", 1)[0]
        elif "with" in segment:
            segment = segment.split("with", 1)[0]

        filename = segment.split()[0] if segment.split() else "output.txt"
        filename = sanitize_path(filename)
        if not os.path.splitext(filename)[1]:
            filename += ".txt"
        return filename

    def extract_content(query: str) -> str:
        query_lower = query.lower()
        if "with content" in query_lower:
            return query.split("with content", 1)[1].strip(" \"'")
        if "containing" in query_lower:
            return query.split("containing", 1)[1].strip(" \"'")
        return "File created by Local Code Assistant"

    def simple_runner(query: str) -> str:
        lower = query.lower()
        if any(keyword in lower for keyword in ["list", "show directory", "ls", "dir"]):
            return list_directory(".")
        if "read file" in lower:
            parts = query.split("read file", 1)[1].strip().split()
            filename = sanitize_path(parts[0]) if parts else "output.txt"
            return read_file(filename)
        if "create" in lower and "file" in lower:
            filename = extract_filename(query)
            content = extract_content(query)
            return write_file(filename, content)
        return (
            "Simple backend can create/list/read files. "
            "Try: 'Create a file called example.txt with content hello'"
        )

    return simple_runner


def main():
    args = parse_args()
    runner = create_runner(args.backend, args.model)

    if args.interactive or not args.command:
        run_interactive(runner, args.json)
    else:
        run_and_report(runner, args.command, args.json)


if __name__ == "__main__":
    main()
