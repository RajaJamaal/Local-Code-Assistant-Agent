# Local Code Assistant

Local-first LangGraph/LangChain playground for experimenting with file-oriented agents that run entirely on a downloaded Ollama model.

## Project Layout

- `src/` – production code (`agent`, `tools`, `utils`) powering LangGraph and heuristic agents.
- `scripts/cli/` – runnable entry points (heuristic CLI, LangGraph CLI, interactive demo).
- `scripts/diagnostics/` – debugging harnesses and smoke tests for tooling/Ollama connectivity.
- `scripts/maintenance/` – one-off helpers for regenerating or patching project files.
- `tests/manual/` – executable scenarios you can run locally to validate behaviour end-to-end.

## Prerequisites

1. Install [Ollama](https://ollama.com) and ensure the service is running.
2. Pull a compatible model (default is `codellama:7b-code-q4_K_M`):
   ```bash
   ollama pull codellama:7b-code-q4_K_M
   ```
3. Create a virtual environment and install dependencies:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

## Running the Agents

```bash
# Heuristic (LLM-free) workflow for simple file commands
python scripts/cli/local_assistant.py --interactive

# Full LangGraph agent using the local Ollama model
python scripts/cli/langgraph_agent.py --interactive --model codellama:7b-code-q4_K_M

# Lightweight heuristic backend (no LLM required)
python scripts/cli/langgraph_agent.py --backend simple --interactive

# One-off LangGraph command with JSON output (useful for VSCode integrations)
python scripts/cli/langgraph_agent.py "Create hello.py printing hi" --json
```

### VSCode Extension

The `vscode-extension/` folder contains a ready-to-run extension that shells out to the LangGraph CLI.

```bash
cd vscode-extension
npm install
npm run compile
# optional: create .vsix for local install
npm install -g @vscode/vsce
vsce package
```

Open the folder in VSCode and hit `F5` to start an Extension Development Host, then run **Local Code Assistant: Run Query** from the command palette. The extension exposes settings for the Python path, CLI location, working directory, and Ollama model so it can adapt to different setups.

See `docs/vscode.md` for a full walkthrough of the available commands, multi-turn response history, and configuration options.

## Diagnostics & Manual Tests

```bash
# Verify overall toolchain and Ollama connection
python scripts/diagnostics/comprehensive_test.py

# Run the LangGraph agent smoke test
python tests/manual/test_agent.py

# Validate CLI JSON mode (simple backend, no LLM required)
python tests/manual/test_cli_json.py

# Regression test for simple backend (text responses)
python tests/manual/test_cli_simple_suite.py

# Mocked LangGraph backend (exercises CLI JSON mode without Ollama)
LANGGRAPH_AGENT_MOCK=1 python tests/manual/test_cli_langgraph_mock.py

# Confirm filesystem helpers are healthy
python tests/manual/test_direct_write.py
```

## Automation Shortcuts

Common tasks are available via `make`:

```bash
make setup           # create .venv and install Python deps
make test-cli        # run simple-backend regression test
make test-json       # run CLI JSON-mode test
make test-llm        # run LangGraph mock-path test
make test-all        # run both CLI tests
make build-extension # install npm deps and build the VSCode extension
make package-extension # build and package VSCode extension into a .vsix
```

## Continuous Integration

GitHub Actions (`.github/workflows/ci.yml`) automatically install dependencies and run the CLI regression tests on every push/PR targeting `main`/`master`. Extend this workflow as needed (e.g., to build the VSCode extension or run additional diagnostics) once the remote infrastructure can reach your Ollama service.
