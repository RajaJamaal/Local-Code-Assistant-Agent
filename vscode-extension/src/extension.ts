import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

let responsePanel: vscode.WebviewPanel | undefined;
let panelMessageSubscription: vscode.Disposable | undefined;
const responseHistory: QueryResult[] = [];

interface QueryResult {
  response: string;
  cwd: string;
  filePath?: string;
  timestamp: number;
}

function getConfig() {
  const config = vscode.workspace.getConfiguration('localCodeAssistant');
  const pythonDefault = process.platform === 'win32' ? 'python' : 'python3';
  return {
    pythonPath: config.get<string>('pythonPath', pythonDefault),
    cliPath: config.get<string>('cliPath', 'scripts/cli/langgraph_agent.py'),
    backend: config.get<string>('backend', 'langgraph'),
    model: config.get<string>('model', 'codellama:7b-code-q4_K_M'),
    workingDirectory: config.get<string>('workingDirectory', '')
  };
}

async function runQuery(query: string, output: vscode.OutputChannel): Promise<QueryResult | null> {
  const config = getConfig();
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    vscode.window.showErrorMessage('Open a folder containing the Local Code Assistant project before running the command.');
    return null;
  }

  const cwd = config.workingDirectory
    ? config.workingDirectory
    : workspaceFolder.uri.fsPath;
  const resolvedCliPath = path.isAbsolute(config.cliPath)
    ? config.cliPath
    : path.join(cwd, config.cliPath);

  if (!fs.existsSync(resolvedCliPath)) {
    vscode.window.showErrorMessage(`LangGraph CLI not found at ${resolvedCliPath}`);
    return null;
  }

  output.appendLine(`Running local agent (${config.backend}) with model '${config.model}'...`);
  const args = [
    resolvedCliPath,
    '--backend',
    config.backend,
    '--model',
    config.model,
    '--json',
    query
  ];

  return new Promise<QueryResult>((resolve, reject) => {
    const child = cp.spawn(config.pythonPath, args, { cwd });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      output.append(chunk);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        const error = new Error(`Local agent exited with code ${code}`);
        if (stderr) {
          output.appendLine(stderr);
        }
        return reject(error);
      }

      const jsonLine = stdout.trim().split('\n').filter(Boolean).pop() ?? '';
      try {
        const payload = JSON.parse(jsonLine);
        const response = payload.response ?? payload.error ?? stdout.trim();
        output.appendLine(response);
        vscode.window.showInformationMessage('Local agent response received.');
        resolve({ response, cwd, timestamp: Date.now() });
      } catch (error) {
        output.appendLine('Raw output:');
        output.appendLine(stdout);
        reject(new Error('Failed to parse agent output. Check the output channel for details.'));
      }
    });
  });
}

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('Local Code Assistant');

  const runQueryCommand = vscode.commands.registerCommand('localCodeAssistant.runQuery', async () => {
    const query = await vscode.window.showInputBox({
      prompt: 'Ask the local coding assistant',
      placeHolder: "e.g. Create a file called hello.py that prints 'Hello'",
      ignoreFocusOut: true
    });

    if (!query) {
      return;
    }

    try {
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Local Code Assistant',
          cancellable: false
        },
        async () => runQuery(query, outputChannel)
      );
      if (!result) {
        return;
      }
      showResponsePanel(result);
      outputChannel.show(true);
    } catch (error) {
      vscode.window.showErrorMessage(String(error));
    }
  });

  const runSelectionCommand = vscode.commands.registerCommand('localCodeAssistant.runSelection', async () => {
    const editor = vscode.window.activeTextEditor;
    const selectedText = editor?.document.getText(editor.selection).trim() ?? '';

    if (!selectedText) {
      vscode.window.showWarningMessage('Select some code/text before running this command.');
      return;
    }

    const instruction = await vscode.window.showInputBox({
      prompt: 'Describe what you want done with the selected text (optional)',
      placeHolder: 'e.g. Review this function',
      ignoreFocusOut: true
    });

    const query = instruction
      ? `${instruction}\n\nContext:\n${selectedText}`
      : selectedText;

    try {
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Local Code Assistant (Selection)',
          cancellable: false
        },
        async () => runQuery(query, outputChannel)
      );
      if (!result) {
        return;
      }
      showResponsePanel(result);
      outputChannel.show(true);
    } catch (error) {
      vscode.window.showErrorMessage(String(error));
    }
  });

  context.subscriptions.push(runQueryCommand, runSelectionCommand, outputChannel);
}

export function deactivate() {
  // Nothing to cleanup.
}

function showResponsePanel(result: QueryResult) {
  result.filePath = extractFilePath(result.response);
  responseHistory.push(result);
  if (responseHistory.length > 10) {
    responseHistory.shift();
  }

  if (!responsePanel) {
    responsePanel = vscode.window.createWebviewPanel(
      'localCodeAssistantResponse',
      'Local Code Assistant',
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );
    responsePanel.onDidDispose(() => {
      responsePanel = undefined;
      panelMessageSubscription?.dispose();
      panelMessageSubscription = undefined;
    });
  }

  responsePanel.webview.html = getWebviewContent(responsePanel.webview, responseHistory);
  responsePanel.reveal();

  panelMessageSubscription?.dispose();
  panelMessageSubscription = responsePanel.webview.onDidReceiveMessage(async (message) => {
    if (message.command === 'copy') {
      const entry = responseHistory[message.index];
      if (!entry) {
        return;
      }
      await vscode.env.clipboard.writeText(entry.response);
      vscode.window.showInformationMessage('Response copied to clipboard.');
    }

    if (message.command === 'openFile') {
      const entry = responseHistory[message.index];
      if (!entry?.filePath) {
        vscode.window.showErrorMessage('No file path found for this response.');
        return;
      }
      const resolvedPath = path.isAbsolute(entry.filePath)
        ? entry.filePath
        : path.join(entry.cwd, entry.filePath);
      if (!fs.existsSync(resolvedPath)) {
        vscode.window.showErrorMessage(`File not found: ${resolvedPath}`);
        return;
      }
      try {
        const doc = await vscode.workspace.openTextDocument(resolvedPath);
        await vscode.window.showTextDocument(doc);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to open file: ${error}`);
      }
    }
  });
}

function extractFilePath(response: string): string | undefined {
  const match = response.match(/Successfully wrote to '([^']+)'/);
  return match ? match[1] : undefined;
}

function getWebviewContent(webview: vscode.Webview, history: QueryResult[]): string {
  const entries = history
    .slice()
    .reverse()
    .map((entry, displayIndex) => {
      const originalIndex = history.length - displayIndex - 1;
      const escapedResponse = escapeHtml(entry.response);
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      const openFileButton = entry.filePath
        ? `<button data-index="${originalIndex}" class="open-file">Open ${escapeHtml(entry.filePath)}</button>`
        : '';
      return `<section class="entry">
        <header>
          <strong>Response ${history.length - displayIndex}</strong>
          <span>${timestamp}</span>
        </header>
        <div class="actions">
          <button data-index="${originalIndex}" class="copy">Copy</button>
          ${openFileButton}
        </div>
        <pre>${escapedResponse}</pre>
      </section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${webview.cspSource}; style-src ${webview.cspSource};">
  <style>
    body { font-family: sans-serif; padding: 1rem; }
    pre { white-space: pre-wrap; background: #111; color: #eee; padding: 1rem; border-radius: 4px; }
    button { margin-right: 0.5rem; }
    .entry { border-bottom: 1px solid #333; padding-bottom: 1rem; margin-bottom: 1rem; }
    header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
  </style>
</head>
<body>
  <h2>Local Code Assistant Responses</h2>
  ${entries || '<p>No responses yet.</p>'}
  <script>
    const vscode = acquireVsCodeApi();
    document.querySelectorAll('.copy').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.getAttribute('data-index'));
        vscode.postMessage({ command: 'copy', index });
      });
    });
    document.querySelectorAll('.open-file').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.getAttribute('data-index'));
        vscode.postMessage({ command: 'openFile', index });
      });
    });
  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
