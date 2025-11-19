## VSCode Extension (Local Code Assistant)

This extension shells out to `scripts/cli/langgraph_agent.py` and displays the response inside VSCode.  
It is intentionally minimal so you can iterate on the Python agent without shipping data to external services.

### Setup

```bash
cd vscode-extension
npm install
npm run compile
```

Open this folder in VSCode and press `F5` to launch an Extension Development Host.  
Use the “Local Code Assistant: Run Query” command from the palette to ask the agent for help.

### Settings

- `localCodeAssistant.pythonPath` – Python executable (defaults to `python3` / `python` on Windows).
- `localCodeAssistant.cliPath` – Path to `scripts/cli/langgraph_agent.py` relative to the workspace.
- `localCodeAssistant.backend` – Choose between `langgraph` (LLM) or `simple` (heuristic) backend.
- `localCodeAssistant.model` – Ollama model passed to the CLI.
- `localCodeAssistant.workingDirectory` – Override working directory (defaults to first workspace folder).

### Commands

- **Local Code Assistant: Run Query** – prompts for a free-form question and streams the response.
- **Local Code Assistant: Use Selection** – sends the current editor selection (optionally with extra instructions) to the CLI, which is handy for quick reviews or file-specific tasks.
