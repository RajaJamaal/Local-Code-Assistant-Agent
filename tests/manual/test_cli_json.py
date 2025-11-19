#!/usr/bin/env python3
"""
Smoke test for the langgraph_agent.py CLI JSON mode.
Runs with the simple backend so it does not require the LLM stack.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CLI_PATH = PROJECT_ROOT / "scripts/cli/langgraph_agent.py"
TEST_FILE = PROJECT_ROOT / "cli_json_test.txt"


def run_cli(command: str):
    process = subprocess.run(
        [
            sys.executable,
            str(CLI_PATH),
            "--backend",
            "simple",
            "--json",
            command,
        ],
        cwd=PROJECT_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    # CLI may print multiple lines; take the last JSON blob
    json_line = process.stdout.strip().splitlines()[-1]
    return json.loads(json_line)


def main():
    if TEST_FILE.exists():
        TEST_FILE.unlink()

    payload = run_cli("Create a file called cli_json_test.txt with content Hello JSON")
    assert payload["success"], f"Expected success payload, got: {payload}"
    assert TEST_FILE.exists(), "Test file was not created"
    assert TEST_FILE.read_text().strip() == "Hello JSON"

    payload = run_cli("read file cli_json_test.txt")
    assert "Hello JSON" in payload["response"], "Read response missing file content"

    TEST_FILE.unlink()
    print("✅ CLI JSON mode (simple backend) works as expected.")


if __name__ == "__main__":
    main()
