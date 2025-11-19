#!/usr/bin/env python3
"""
Ensures the LangGraph backend can be mocked via LANGGRAPH_AGENT_MOCK=1.
This allows CI to cover the LangGraph code path without requiring Ollama.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CLI_PATH = PROJECT_ROOT / "scripts" / "cli" / "langgraph_agent.py"


def run_cli(command: str) -> dict:
    env = os.environ.copy()
    env["LANGGRAPH_AGENT_MOCK"] = "1"
    env["PYTHONPATH"] = env.get("PYTHONPATH", "")
    process = subprocess.run(
        [
            sys.executable,
            str(CLI_PATH),
            "--json",
            command,
        ],
        cwd=PROJECT_ROOT,
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )
    payload = json.loads(process.stdout.strip().splitlines()[-1])
    return payload


def main():
    payload = run_cli("Describe the mock behavior.")
    assert payload["success"], payload
    assert "[Mock LangGraph response]" in payload["response"]
    print("✅ LangGraph mock backend works as expected.")


if __name__ == "__main__":
    main()
