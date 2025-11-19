#!/usr/bin/env python3
"""
Regression test for the CLI simple backend (no LLM required).
Verifies create -> list -> read flow via langgraph_agent.py.
"""
import os
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CLI_PATH = PROJECT_ROOT / "scripts" / "cli" / "langgraph_agent.py"
TEST_FILE = PROJECT_ROOT / "cli_simple_suite.txt"


def run_cli(command: str) -> str:
    process = subprocess.run(
        [
            sys.executable,
            str(CLI_PATH),
            "--backend",
            "simple",
            command,
        ],
        cwd=PROJECT_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return process.stdout.strip()


def main():
    if TEST_FILE.exists():
        TEST_FILE.unlink()

    output = run_cli("Create a file called cli_simple_suite.txt with content Simple backend test")
    assert "Successfully wrote" in output, output
    assert TEST_FILE.exists(), "Expected file to be created"

    output = run_cli("list directory")
    assert "cli_simple_suite.txt" in output, "Expected new file in directory listing"

    output = run_cli("read file cli_simple_suite.txt")
    assert "Simple backend test" in output, "Expected content to match"

    TEST_FILE.unlink()
    print("✅ CLI simple backend regression test passed.")


if __name__ == "__main__":
    main()
