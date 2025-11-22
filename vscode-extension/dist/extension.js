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
const responseHistory = [];
let chatViewProvider;
let formState = {
    prompt: '',
    context: '',
    backend: 'langgraph',
    model: 'codellama:7b-code-q4_K_M',
    temperature: 0.1,
    mode: 'assistant'
};
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
async function runQuery(query, output, overrides) {
    var _a, _b, _c, _d, _e, _f;
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
    const backend = (_b = overrides === null || overrides === void 0 ? void 0 : overrides.backend) !== null && _b !== void 0 ? _b : config.backend;
    const model = (_c = overrides === null || overrides === void 0 ? void 0 : overrides.model) !== null && _c !== void 0 ? _c : config.model;
    const temperature = (_d = overrides === null || overrides === void 0 ? void 0 : overrides.temperature) !== null && _d !== void 0 ? _d : undefined;
    const contextOverride = (_e = overrides === null || overrides === void 0 ? void 0 : overrides.context) !== null && _e !== void 0 ? _e : null;
    const mode = (_f = overrides === null || overrides === void 0 ? void 0 : overrides.mode) !== null && _f !== void 0 ? _f : 'assistant';
    output.appendLine(`Running local agent (${backend}) with model '${model}'...`);
    const args = [
        resolvedCliPath,
        '--backend',
        backend,
        '--model',
        model,
        '--json'
    ];
    if (typeof temperature === 'number') {
        args.push('--temperature', temperature.toString());
    }
    if (contextOverride && contextOverride.trim().length > 0) {
        args.push('--context', contextOverride);
    }
    args.push(query);
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
                resolve({
                    response,
                    cwd,
                    timestamp: Date.now(),
                    prompt: query,
                    context: contextOverride || undefined,
                    backend,
                    model,
                    temperature,
                    mode
                });
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
    outputChannel.appendLine('[local-code-assistant] Extension activated');
    const baseConfig = getConfig();
    formState.backend = baseConfig.backend;
    formState.model = baseConfig.model;
    const handleSubmit = async (data) => {
        var _a, _b, _c, _d, _e, _f;
        const prompt = (_a = data.prompt) === null || _a === void 0 ? void 0 : _a.trim();
        if (!prompt) {
            vscode.window.showWarningMessage('Please enter a prompt.');
            return;
        }
        formState = {
            prompt,
            context: (_b = data.context) !== null && _b !== void 0 ? _b : '',
            backend: (_c = data.backend) !== null && _c !== void 0 ? _c : baseConfig.backend,
            model: (_d = data.model) !== null && _d !== void 0 ? _d : baseConfig.model,
            temperature: typeof data.temperature === 'number' ? data.temperature : ((_e = formState.temperature) !== null && _e !== void 0 ? _e : 0.1),
            mode: (_f = data.mode) !== null && _f !== void 0 ? _f : formState.mode
        };
        try {
            const result = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Local Code Assistant',
                cancellable: false
            }, async () => runQuery(prompt, outputChannel, {
                backend: data.backend,
                model: data.model,
                temperature: data.temperature,
                context: data.context,
                mode: data.mode
            }));
            if (!result) {
                return;
            }
            chatViewProvider === null || chatViewProvider === void 0 ? void 0 : chatViewProvider.addResponse(result);
            outputChannel.show(true);
        }
        catch (error) {
            vscode.window.showErrorMessage(String(error));
        }
    };
    chatViewProvider = new ChatViewProvider(context.extensionUri, handleSubmit);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('localCodeAssistant.history', chatViewProvider));
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
            chatViewProvider === null || chatViewProvider === void 0 ? void 0 : chatViewProvider.addResponse(result);
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
            chatViewProvider === null || chatViewProvider === void 0 ? void 0 : chatViewProvider.addResponse(result);
            outputChannel.show(true);
        }
        catch (error) {
            vscode.window.showErrorMessage(String(error));
        }
    });
    const openPanelCommand = vscode.commands.registerCommand('localCodeAssistant.openPanel', async () => {
        if (!chatViewProvider) {
            vscode.window.showInformationMessage('Sidebar not ready yet.');
            return;
        }
        chatViewProvider.reveal();
    });
    context.subscriptions.push(runQueryCommand, runSelectionCommand, openPanelCommand, outputChannel);
}
function deactivate() {
    // Nothing to cleanup.
}
class ChatViewProvider {
    constructor(extensionUri, submitHandler) {
        this.extensionUri = extensionUri;
        this.submitHandler = submitHandler;
    }
    resolveWebviewView(webviewView, _context, _token) {
        this.view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };
        webviewView.webview.html = this.getHtml(webviewView.webview);
        this.postState();
        webviewView.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'runQuery') {
                this.submitHandler(message.data);
                return;
            }
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
    postState() {
        if (!this.view)
            return;
        const files = this.getWorkspaceFiles();
        this.view.webview.postMessage({
            command: 'hydrate',
            formState,
            suggestions: files
        });
    }
    getWorkspaceFiles() {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders)
            return [];
        const uris = vscode.workspace.findFiles('**/*', '**/{.git,node_modules,.venv}/**', 50);
        // findFiles returns Thenable<Uri[]>; handle asynchronously
        uris.then((list) => {
            const rel = list.map((u) => vscode.workspace.asRelativePath(u, false));
            if (this.view) {
                this.view.webview.postMessage({ command: 'suggestions', suggestions: rel });
            }
        });
        return [];
    }
    getHtml(webview) {
        var _a, _b;
        const config = getConfig();
        const entries = responseHistory
            .slice()
            .reverse()
            .map((entry, displayIndex) => {
            const originalIndex = responseHistory.length - displayIndex - 1;
            const escapedResponse = escapeHtml(entry.response);
            const timestamp = new Date(entry.timestamp).toLocaleTimeString();
            const openFileButton = entry.filePath
                ? `<button data-index="${originalIndex}" class="open-file">Open ${escapeHtml(entry.filePath)}</button>`
                : '';
            return `<section class="entry">
          <header>
            <strong>Response ${responseHistory.length - displayIndex}</strong>
            <span>${timestamp}</span>
          </header>
          <div class="actions">
            <button data-index="${originalIndex}" class="copy">Copy</button>
            ${openFileButton}
          </div>
          <pre><strong>You:</strong> ${escapeHtml(entry.prompt)}${entry.context ? `<br><em>Context:</em> ${escapeHtml(entry.context)}` : ''}\n\n<strong>Assistant:</strong> ${escapedResponse}</pre>
        </section>`;
        })
            .join('\n');
        const cspSource = webview.cspSource;
        const defaultBackend = (_b = (_a = formState.backend) !== null && _a !== void 0 ? _a : config.backend) !== null && _b !== void 0 ? _b : 'langgraph';
        const backendOptions = ['langgraph', 'simple']
            .map((value) => `<option value="${value}" ${value === defaultBackend ? 'selected' : ''}>${value}</option>`)
            .join('');
        const defaultModel = escapeHtml(formState.model || config.model || 'codellama:7b-code-q4_K_M');
        const defaultTemp = typeof formState.temperature === 'number' ? formState.temperature : 0.1;
        const defaultPrompt = escapeHtml(formState.prompt || '');
        const defaultContext = escapeHtml(formState.context || '');
        const defaultMode = formState.mode || 'assistant';
        const modeOptions = ['assistant', 'agent']
            .map((value) => `<option value="${value}" ${value === defaultMode ? 'selected' : ''}>${value}</option>`)
            .join('');
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource}; script-src ${cspSource}; style-src ${cspSource} 'unsafe-inline';">
  <style>
    body { font-family: sans-serif; padding: 1rem; color: #eee; background: #1e1e1e; }
    form { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
    textarea, select, input { width: 100%; padding: 0.4rem; border-radius: 4px; border: 1px solid #444; background: #2a2a2a; color: #eee; }
    label { font-size: 0.9rem; }
    button { background: #007acc; color: #fff; border: none; padding: 0.6rem 1rem; border-radius: 4px; cursor: pointer; }
    button:hover { background: #1a85ff; }
    pre { white-space: pre-wrap; background: #111; color: #eee; padding: 1rem; border-radius: 4px; }
    button { margin-right: 0.5rem; }
    .entry { border-bottom: 1px solid #333; padding-bottom: 1rem; margin-bottom: 1rem; }
    header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
    .actions button { margin-top: 0.25rem; }
    .controls-row { display: flex; gap: 0.5rem; align-items: center; }
    .controls-row label { flex: 1; }
    .temperature-display { font-variant-numeric: tabular-nums; margin-left: 0.5rem; }
  </style>
</head>
<body>
  <h2>Local Code Assistant</h2>
  <form id="assistant-form">
    <label>
      Prompt
      <textarea id="prompt" rows="3" placeholder="Ask the assistant...">${defaultPrompt}</textarea>
    </label>
    <label>
      Context (optional)
      <textarea id="context" rows="2" list="context-suggestions" placeholder="Add system context or file summary...">${defaultContext}</textarea>
      <datalist id="context-suggestions"></datalist>
    </label>
    <div class="controls-row">
      <label>Backend
        <select id="backend">${backendOptions}</select>
      </label>
      <label>Model
        <input id="model" value="${defaultModel}" />
      </label>
    </div>
    <div class="controls-row">
      <label>Mode
        <select id="mode">${modeOptions}</select>
      </label>
    </div>
    <div class="controls-row">
      <label>Temperature
        <input type="range" id="temperature" min="0" max="1" step="0.05" value="${defaultTemp}" />
      </label>
      <span class="temperature-display" id="temperature-label">${defaultTemp.toFixed(2)}</span>
    </div>
    <button type="submit">Run</button>
  </form>
  <section id="responses">
    ${entries || '<p>No responses yet. Submit a prompt to begin.</p>'}
  </section>
  <script>
    const vscode = acquireVsCodeApi();
    const form = document.getElementById('assistant-form');
    const tempSlider = document.getElementById('temperature');
    const tempLabel = document.getElementById('temperature-label');
    tempSlider?.addEventListener('input', () => {
      tempLabel.textContent = Number(tempSlider.value).toFixed(2);
    });
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const prompt = document.getElementById('prompt').value;
      const context = document.getElementById('context').value;
      const backend = document.getElementById('backend').value;
      const model = document.getElementById('model').value;
      const temperature = Number(document.getElementById('temperature').value);
      const mode = document.getElementById('mode').value;
      vscode.postMessage({
        command: 'runQuery',
        data: { prompt, context, backend, model, temperature, mode }
      });
    });
    window.addEventListener('message', (event) => {
      const message = event.data;
      if (!message) return;
      if (message.command === 'hydrate' || message.command === 'suggestions') {
        const list = document.getElementById('context-suggestions');
        if (list && Array.isArray(message.suggestions)) {
          list.innerHTML = message.suggestions
            .map((item) => '<option value="' + item + '"></option>')
            .join('');
        }
      }
    });
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
    addResponse(result) {
        result.filePath = extractFilePath(result.response);
        responseHistory.push(result);
        if (responseHistory.length > 10) {
            responseHistory.shift();
        }
        this.refresh();
    }
    refresh() {
        if (this.view) {
            this.view.webview.html = this.getHtml(this.view.webview);
            this.postState();
        }
    }
    reveal() {
        var _a, _b;
        (_b = (_a = this.view) === null || _a === void 0 ? void 0 : _a.show) === null || _b === void 0 ? void 0 : _b.call(_a, true);
    }
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