# VSCode Integration Guide

This repository ships with a minimal VSCode extension (`vscode-extension/`) that shells out to `scripts/cli/langgraph_agent.py`. Follow these steps to build, run, and configure it.

## Prerequisites

- VSCode 1.85 or newer
- Node.js 18+ (used for building the extension)
- Python environment + Ollama (as described in the root `README.md`)

## Build & Launch

```bash
cd vscode-extension
npm install
npm run compile
```

Open the `vscode-extension/` folder in VSCode and press `F5` to start an **Extension Development Host**. Inside that window you can trigger:

- **Local Code Assistant: Run Query** – prompt for any command
- **Local Code Assistant: Use Selection** – send current selection (+ optional instructions) to the CLI

## Configuration

The extension contributes these settings (`File → Preferences → Settings → Extensions → Local Code Assistant`):

| Setting | Description |
| --- | --- |
| `localCodeAssistant.pythonPath` | Python executable used to run the CLI (`python3`, `.venv/bin/python`, etc.) |
| `localCodeAssistant.cliPath` | Path to `scripts/cli/langgraph_agent.py` (relative or absolute) |
| `localCodeAssistant.backend` | `langgraph` for the LLM workflow or `simple` to use the lightweight backend |
| `localCodeAssistant.model` | Ollama model passed via `--model` (ignored in simple mode) |
| `localCodeAssistant.workingDirectory` | Override the working directory; defaults to the first workspace folder |

## Tips

- Use the `simple` backend when you just need deterministic file operations without waiting for the LLM.
- When using the LangGraph backend, ensure `ollama serve` is running and the target model is pulled (`ollama pull codellama:7b-code-q4_K_M`).
- The extension reads JSON output from the CLI; if you change the CLI formatting, re-run `tests/manual/test_cli_json.py` to ensure compatibility.
