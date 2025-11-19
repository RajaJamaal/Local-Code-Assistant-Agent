"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const cp = __importStar(require("child_process"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let responsePanel;
let panelMessageSubscription;
const responseHistory = [];
function getConfig() {
    const config = vscode.workspace.getConfiguration('localCodeAssistant');
    const pythonDefault = process.platform === 'win32' ? 'python' : 'python3';
    return {
        pythonPath: config.get('pythonPath', pythonDefault),
        cliPath: config.get('cliPath', 'scripts/cli/langgraph_agent.py'),
        backend: config.get('backend', 'langgraph'),
        model: config.get('model', 'codellama:7b-code-q4_K_M'),
        workingDirectory: config.get('workingDirectory', '')
    };
}
async function runQuery(query, output) {
    var _a;
    const config = getConfig();
    const workspaceFolder = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0];
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
    return new Promise((resolve, reject) => {
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
            var _a, _b, _c;
            if (code !== 0) {
                const error = new Error(`Local agent exited with code ${code}`);
                if (stderr) {
                    output.appendLine(stderr);
                }
                return reject(error);
            }
            const jsonLine = (_a = stdout.trim().split('\n').filter(Boolean).pop()) !== null && _a !== void 0 ? _a : '';
            try {
                const payload = JSON.parse(jsonLine);
                const response = (_c = (_b = payload.response) !== null && _b !== void 0 ? _b : payload.error) !== null && _c !== void 0 ? _c : stdout.trim();
                output.appendLine(response);
                vscode.window.showInformationMessage('Local agent response received.');
                resolve({ response, cwd, timestamp: Date.now() });
            }
            catch (error) {
                output.appendLine('Raw output:');
                output.appendLine(stdout);
                reject(new Error('Failed to parse agent output. Check the output channel for details.'));
            }
        });
    });
}
function activate(context) {
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
            const result = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Local Code Assistant',
                cancellable: false
            }, async () => runQuery(query, outputChannel));
            if (!result) {
                return;
            }
            showResponsePanel(result);
            outputChannel.show(true);
        }
        catch (error) {
            vscode.window.showErrorMessage(String(error));
        }
    });
    const runSelectionCommand = vscode.commands.registerCommand('localCodeAssistant.runSelection', async () => {
        var _a;
        const editor = vscode.window.activeTextEditor;
        const selectedText = (_a = editor === null || editor === void 0 ? void 0 : editor.document.getText(editor.selection).trim()) !== null && _a !== void 0 ? _a : '';
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
            const result = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Local Code Assistant (Selection)',
                cancellable: false
            }, async () => runQuery(query, outputChannel));
            if (!result) {
                return;
            }
            showResponsePanel(result);
            outputChannel.show(true);
        }
        catch (error) {
            vscode.window.showErrorMessage(String(error));
        }
    });
    context.subscriptions.push(runQueryCommand, runSelectionCommand, outputChannel);
}
function deactivate() {
    // Nothing to cleanup.
}
function showResponsePanel(result) {
    result.filePath = extractFilePath(result.response);
    responseHistory.push(result);
    if (responseHistory.length > 10) {
        responseHistory.shift();
    }
    if (!responsePanel) {
        responsePanel = vscode.window.createWebviewPanel('localCodeAssistantResponse', 'Local Code Assistant', vscode.ViewColumn.Beside, { enableScripts: true });
        responsePanel.onDidDispose(() => {
            responsePanel = undefined;
            panelMessageSubscription === null || panelMessageSubscription === void 0 ? void 0 : panelMessageSubscription.dispose();
            panelMessageSubscription = undefined;
        });
    }
    responsePanel.webview.html = getWebviewContent(responsePanel.webview, responseHistory);
    responsePanel.reveal();
    panelMessageSubscription === null || panelMessageSubscription === void 0 ? void 0 : panelMessageSubscription.dispose();
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
            if (!(entry === null || entry === void 0 ? void 0 : entry.filePath)) {
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
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to open file: ${error}`);
            }
        }
    });
}
function extractFilePath(response) {
    const match = response.match(/Successfully wrote to '([^']+)'/);
    return match ? match[1] : undefined;
}
function getWebviewContent(webview, history) {
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
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
//# sourceMappingURL=extension.js.map