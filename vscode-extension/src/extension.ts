import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface QueryResult {
  response: string;
  cwd: string;
  filePath?: string;
  timestamp: number;
  prompt: string;
  contexts?: string[];
  backend: string;
  model: string;
  temperature?: number;
  mode: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

interface QueryOverrides {
  backend?: string;
  model?: string;
  contexts?: string[];
  temperature?: number;
  mode?: string;
}

interface FormMessage {
  prompt: string;
  contexts?: string[];
  backend?: string;
  model?: string;
  temperature?: number;
  mode?: string;
}

interface FormState {
  prompt: string;
  contexts: string[];
  backend: string;
  model: string;
  temperature: number;
  mode: string;
}

interface PersistedState {
  form: FormState;
  history: QueryResult[];
}

const responseHistory: QueryResult[] = [];
let chatViewProvider: ChatViewProvider | undefined;
let formState: FormState = {
  prompt: '',
  contexts: [],
  backend: 'langgraph',
  model: 'phi4-mini:3.8b',
  temperature: 0.1,
  mode: 'assistant'
};
const MAX_HISTORY = 20;
const STORAGE_KEY = 'localCodeAssistant.state';
let extContext: vscode.ExtensionContext;

function getConfig() {
  const config = vscode.workspace.getConfiguration('localCodeAssistant');
  const pythonDefault = process.platform === 'win32' ? 'python' : 'python3';
  return {
    pythonPath: config.get<string>('pythonPath', pythonDefault),
    cliPath: config.get<string>('cliPath', 'scripts/cli/langgraph_agent.py'),
    backend: config.get<string>('backend', 'langgraph'),
    model: config.get<string>('model', 'phi4-mini:3.8b'),
    workingDirectory: config.get<string>('workingDirectory', '')
  };
}

function persistState() {
  if (!extContext) return;
  const payload: PersistedState = { form: formState, history: responseHistory };
  extContext.globalState.update(STORAGE_KEY, payload);
}

function loadState() {
  if (!extContext) return;
  const data = extContext.globalState.get<PersistedState>(STORAGE_KEY);
  if (data) {
    formState = { ...formState, ...data.form };
    responseHistory.splice(0, responseHistory.length, ...data.history.slice(-MAX_HISTORY));
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractFilePath(response: string): string | undefined {
  const match = response.match(/Successfully wrote to '([^']+)'/);
  return match ? match[1] : undefined;
}

async function buildAugmentedContext(
  baseContexts: string[] | null,
  prompt: string,
  workspaceUri: vscode.Uri
): Promise<string> {
  const pieces: string[] = [];
  if (baseContexts && baseContexts.length) {
    const cleaned = baseContexts.filter((c) => c && c.trim()).map((c) => c.trim());
    if (cleaned.length) {
      pieces.push(`User context:\n${cleaned.join('\n')}`);
    }
  }

  // Include open editors (small cap)
  const openEditors = vscode.window.visibleTextEditors;
  for (const editor of openEditors) {
    const doc = editor.document;
    if (doc.isUntitled) continue;
    const rel = vscode.workspace.asRelativePath(doc.uri, false);
    const text = doc.getText().slice(0, 8000);
    pieces.push(`Open file: ${rel}\n${text}`);
  }

  // Resolve @ references in baseContext + prompt
  const combined = `${(baseContexts || []).join(' ')}\n${prompt}`;
  const tokens = Array.from(new Set((combined.match(/@[^\s]+/g) || []).map((t) => t.slice(1))));
  for (const token of tokens) {
    const target = vscode.Uri.joinPath(workspaceUri, token);
    try {
      const stat = await vscode.workspace.fs.stat(target);
      if (stat.type === vscode.FileType.File) {
        const data = await vscode.workspace.fs.readFile(target);
        const text = Buffer.from(data).toString('utf8').slice(0, 8000);
        pieces.push(`@${token}:\n${text}`);
      } else if (stat.type === vscode.FileType.Directory) {
        const files = await vscode.workspace.findFiles(`${token}/**/*`, `${token}/{.git,node_modules,.venv}/**`, 5);
        const rels = files.map((u) => vscode.workspace.asRelativePath(u, false));
        pieces.push(`@${token} (folder listing):\n${rels.join('\n')}`);
      }
    } catch (err) {
      // ignore missing
    }
  }

  return pieces.join('\n\n');
}

async function runQuery(
  query: string,
  output: vscode.OutputChannel,
  overrides?: QueryOverrides
): Promise<QueryResult | null> {
  const config = getConfig();
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    vscode.window.showErrorMessage('Open a folder containing the Local Code Assistant project before running the command.');
    return null;
  }

  const cwd = config.workingDirectory ? config.workingDirectory : workspaceFolder.uri.fsPath;
  const resolvedCliPath = path.isAbsolute(config.cliPath) ? config.cliPath : path.join(cwd, config.cliPath);

  if (!fs.existsSync(resolvedCliPath)) {
    vscode.window.showErrorMessage(`LangGraph CLI not found at ${resolvedCliPath}`);
    return null;
  }

  const mode = overrides?.mode ?? formState.mode ?? 'assistant';
  const backend = mode === 'agent' ? 'langgraph' : overrides?.backend ?? formState.backend ?? config.backend;
  const model = overrides?.model ?? formState.model ?? config.model;
  const temperature = overrides?.temperature ?? formState.temperature;
  const baseContexts = overrides?.contexts ?? formState.contexts;

  const augmentedContext = await buildAugmentedContext(baseContexts, query, workspaceFolder.uri);

  output.appendLine(`Running local agent (${backend}) with model '${model}'...`);
  const args = [resolvedCliPath, '--backend', backend, '--model', model, '--json'];
  if (typeof temperature === 'number') args.push('--temperature', temperature.toString());
  if (augmentedContext && augmentedContext.trim()) args.push('--context', augmentedContext);
  args.push(query);

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
        const usage = payload.usage;
        output.appendLine(response);
        vscode.window.showInformationMessage('Local agent response received.');
       resolve({
         response,
         cwd,
         timestamp: Date.now(),
         prompt: query,
          contexts: baseContexts && baseContexts.length ? baseContexts : undefined,
          backend,
          model,
          temperature,
          mode,
          usage
        });
      } catch (error) {
        output.appendLine('Raw output:');
        output.appendLine(stdout);
        reject(new Error('Failed to parse agent output. Check the output channel for details.'));
      }
    });
  });
}

export function activate(context: vscode.ExtensionContext) {
  extContext = context;
  loadState();
  const outputChannel = vscode.window.createOutputChannel('Local Code Assistant');
  outputChannel.appendLine('[local-code-assistant] Extension activated');

  const baseConfig = getConfig();
  formState.backend = formState.backend || baseConfig.backend;
  formState.model = formState.model || baseConfig.model;

  const handleSubmit = async (data: FormMessage) => {
    const prompt = data.prompt?.trim();
    if (!prompt) {
      vscode.window.showWarningMessage('Please enter a prompt.');
      return;
    }

    formState = {
      prompt,
      contexts: data.contexts ?? formState.contexts ?? [],
      backend: data.backend ?? baseConfig.backend,
      model: data.model ?? baseConfig.model,
      temperature: typeof data.temperature === 'number' ? data.temperature : formState.temperature ?? 0.1,
      mode: data.mode ?? formState.mode
    };
    persistState();

    try {
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Local Code Assistant',
          cancellable: false
        },
        async () =>
          runQuery(prompt, outputChannel, {
            backend: data.backend,
            model: data.model,
            temperature: data.temperature,
            contexts: data.contexts,
            mode: data.mode
          })
      );

      if (!result) return;

      chatViewProvider?.addResponse(result);
      outputChannel.show(true);
    } catch (error) {
      vscode.window.showErrorMessage(String(error));
    }
  };

  chatViewProvider = new ChatViewProvider(context.extensionUri, handleSubmit);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('localCodeAssistant.history', chatViewProvider)
  );

  const runQueryCommand = vscode.commands.registerCommand('localCodeAssistant.runQuery', async () => {
    const query = await vscode.window.showInputBox({
      prompt: 'Ask the local coding assistant',
      placeHolder: "e.g. Create a file called hello.py that prints 'Hello'",
      ignoreFocusOut: true
    });

    if (!query) return;

    try {
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Local Code Assistant',
          cancellable: false
        },
        async () => runQuery(query, outputChannel)
      );
      if (!result) return;
      chatViewProvider?.addResponse(result);
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

    const query = instruction ? `${instruction}\n\nContext:\n${selectedText}` : selectedText;

    try {
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Local Code Assistant (Selection)',
          cancellable: false
        },
        async () => runQuery(query, outputChannel)
      );
      if (!result) return;
      chatViewProvider?.addResponse(result);
      outputChannel.show(true);
    } catch (error) {
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

export function deactivate() {}

class ChatViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  constructor(private readonly extensionUri: vscode.Uri, private readonly submitHandler: (data: FormMessage) => void) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);
    this.postState();

    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'runQuery') {
        this.submitHandler(message.data as FormMessage);
        return;
      }
      if (message.command === 'copy') {
        const entry = responseHistory[message.index];
        if (!entry) return;
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

  private async postState() {
    if (!this.view) return;
    const files = await this.getWorkspaceFiles();
    this.view.webview.postMessage({
      command: 'hydrate',
      formState,
      suggestions: files
    });
  }

  private async getWorkspaceFiles(): Promise<string[]> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) return [];
    try {
      const uris = await vscode.workspace.findFiles(
        '**/*',
        '**/{.git,node_modules,.venv}/**',
        60
      );
      const rel = uris.map((u) => vscode.workspace.asRelativePath(u, false));
      const prefixed = rel.map((p) => `@${p}`);
      // Limit total suggestions to keep the dropdown compact
      return Array.from(new Set(prefixed)).slice(0, 30);
    } catch (err) {
      return [];
    }
  }

  private getHtml(webview: vscode.Webview): string {
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
        const usage = entry.usage
          ? `<div class="usage">Tokens - prompt: ${entry.usage.promptTokens ?? 'n/a'}, completion: ${entry.usage.completionTokens ?? 'n/a'}, total: ${entry.usage.totalTokens ?? 'n/a'}</div>`
          : '';
        const ctxArray = entry.contexts
          ? entry.contexts
          : (entry as any).context
          ? [(entry as any).context]
          : [];
        const contextBlock = ctxArray.length
          ? `<br><em>Contexts:</em> ${escapeHtml(ctxArray.join(', '))}`
          : '';
        return `<section class="entry">
          <header>
            <strong>Response ${responseHistory.length - displayIndex}</strong>
            <span>${timestamp}</span>
          </header>
          <div class="meta">Mode: ${escapeHtml(entry.mode)} | Backend: ${escapeHtml(entry.backend)} | Model: ${escapeHtml(entry.model)} | Temp: ${entry.temperature ?? 'n/a'}</div>
          <div class="actions">
            <button data-index="${originalIndex}" class="copy">Copy</button>
            ${openFileButton}
          </div>
          <pre><strong>You:</strong> ${escapeHtml(entry.prompt)}${contextBlock}\n\n<strong>Assistant:</strong> ${escapedResponse}</pre>
          ${usage}
        </section>`;
      })
      .join('\n');

    const cspSource = webview.cspSource;
    const defaultBackend = formState.backend ?? config.backend ?? 'langgraph';
    const backendOptions = ['langgraph', 'simple']
      .map((value) => `<option value="${value}" ${value === defaultBackend ? 'selected' : ''}>${value}</option>`)
      .join('');
    const defaultModel = escapeHtml(formState.model || config.model || 'phi4-mini:3.8b');
    const defaultTemp = typeof formState.temperature === 'number' ? formState.temperature : 0.1;
    const defaultPrompt = escapeHtml(formState.prompt || '');
    const defaultContext = escapeHtml((formState.contexts || []).join(', '));
    const defaultMode = formState.mode || 'assistant';

    const modeOptions = ['assistant', 'agent']
      .map((value) => `<option value="${value}" ${value === defaultMode ? 'selected' : ''}>${value}</option>`)
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; img-src ${cspSource}; script-src 'unsafe-inline'; style-src ${cspSource} 'unsafe-inline';">
  <style>
    body { font-family: sans-serif; padding: 1rem; color: #eee; background: #1e1e1e; }
    form { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
    textarea, select, input { width: 100%; padding: 0.4rem; border-radius: 4px; border: 1px solid #444; background: #2a2a2a; color: #eee; }
    .dropdown { position: relative; }
    .dropdown-list { position: absolute; top: 100%; left: 0; right: 0; max-height: 200px; overflow-y: auto; background: #1e1e1e; border: 1px solid #444; border-radius: 4px; z-index: 10; padding: 0.25rem; }
    .dropdown-list.hidden { display: none; }
    .dropdown-item { padding: 0.25rem 0.4rem; cursor: pointer; }
    .dropdown-item:hover { background: #2a2a2a; }
    label { font-size: 0.9rem; }
    button { background: #007acc; color: #fff; border: none; padding: 0.6rem 1rem; border-radius: 4px; cursor: pointer; }
    button:hover { background: #1a85ff; }
    pre { white-space: pre-wrap; background: #111; color: #eee; padding: 1rem; border-radius: 4px; }
    .entry { border-bottom: 1px solid #333; padding-bottom: 1rem; margin-bottom: 1rem; }
    header { display: flex; justify-content: space-between; margin-bottom: 0.25rem; }
    .actions { margin-bottom: 0.25rem; }
    .meta { font-size: 0.85rem; color: #ccc; margin-bottom: 0.25rem; }
    .usage { font-size: 0.85rem; color: #aaa; }
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
      Context (optional, use @ to reference files/folders)
      <div class="dropdown">
        <input id="context" placeholder="Add system context or file summary..." value="${defaultContext}" />
        <div id="context-dropdown" class="dropdown-list hidden"></div>
      </div>
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
    (function () {
      const vscode = acquireVsCodeApi();

      const form = document.getElementById('assistant-form');
      const promptEl = document.getElementById('prompt');
      const contextEl = document.getElementById('context');
      const dropdownEl = document.getElementById('context-dropdown');
      const backendEl = document.getElementById('backend');
      const modelEl = document.getElementById('model');
      const modeEl = document.getElementById('mode');
      const tempSlider = document.getElementById('temperature');
      const tempLabel = document.getElementById('temperature-label');
      var suggestionPool = [];

      function readFormState() {
        const rawContext = contextEl && 'value' in contextEl ? contextEl.value : '';
        const contexts = rawContext
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        return {
          prompt: promptEl && 'value' in promptEl ? promptEl.value : '',
          contexts: contexts,
          backend: backendEl && 'value' in backendEl ? backendEl.value : 'langgraph',
          model: modelEl && 'value' in modelEl ? modelEl.value : '',
          temperature: tempSlider && 'value' in tempSlider ? Number(tempSlider.value) : 0.1,
          mode: modeEl && 'value' in modeEl ? modeEl.value : 'assistant'
        };
      }

      var state = vscode.getState() || readFormState();

      function applyStateToForm() {
        if (promptEl && 'value' in promptEl) promptEl.value = state.prompt || '';
        const ctxs = Array.isArray(state.contexts)
          ? state.contexts
          : state.context
          ? [state.context]
          : [];
        if (contextEl && 'value' in contextEl) contextEl.value = ctxs.join(', ');
        if (backendEl && 'value' in backendEl) backendEl.value = state.backend || 'langgraph';
        if (modelEl && 'value' in modelEl) modelEl.value = state.model || '';
        if (modeEl && 'value' in modeEl) modeEl.value = state.mode || 'assistant';
        if (tempSlider && 'value' in tempSlider) {
          tempSlider.value = String(typeof state.temperature === 'number' ? state.temperature : 0.1);
        }
        if (tempLabel) {
          var t = typeof state.temperature === 'number' ? state.temperature : 0.1;
          tempLabel.textContent = t.toFixed(2);
        }
      }

      function saveStateFromForm() {
        state = readFormState();
        vscode.setState(state);
        if (tempLabel) {
          var t = typeof state.temperature === 'number' ? state.temperature : 0.1;
          tempLabel.textContent = t.toFixed(2);
        }
      }

      function getFilterToken() {
        const raw = contextEl && 'value' in contextEl ? contextEl.value : '';
        const parts = raw.split(',');
        return parts[parts.length - 1].trim();
      }

      function setContexts(list) {
        if (!contextEl || !('value' in contextEl)) return;
        contextEl.value = list.join(', ') + (list.length ? ', ' : '');
        saveStateFromForm();
      }

      function renderSuggestions(filterText) {
        if (!dropdownEl) return;
        const filter = filterText ? filterText.toLowerCase() : '';
        const matches = suggestionPool
          .filter(function (s) { return !filter || s.toLowerCase().includes(filter); })
          .slice(0, 30);
        if (!matches.length || !filterText.startsWith('@')) {
          dropdownEl.classList.add('hidden');
          dropdownEl.innerHTML = '';
          return;
        }
        dropdownEl.innerHTML = matches
          .map(function (item) { return '<div class="dropdown-item" data-value="' + item + '">' + item + '</div>'; })
          .join('');
        dropdownEl.classList.remove('hidden');
        dropdownEl.querySelectorAll('.dropdown-item').forEach(function (el) {
          el.addEventListener('mousedown', function (evt) {
            evt.preventDefault();
            const value = el.getAttribute('data-value');
            if (!value) return;
            const current = readFormState().contexts;
            if (!current.includes(value)) {
              current.push(value);
            }
            setContexts(current);
            dropdownEl.classList.add('hidden');
          });
        });
      }

      applyStateToForm();

      if (tempSlider && tempLabel) {
        tempSlider.addEventListener('input', function () {
          tempLabel.textContent = Number(tempSlider.value).toFixed(2);
          saveStateFromForm();
        });
      }

      if (promptEl && 'addEventListener' in promptEl) {
        promptEl.addEventListener('input', saveStateFromForm);
      }
      if (contextEl && 'addEventListener' in contextEl) {
        contextEl.addEventListener('input', function () {
          saveStateFromForm();
          renderSuggestions(getFilterToken());
        });
        contextEl.addEventListener('focus', function () {
          renderSuggestions(getFilterToken());
        });
        contextEl.addEventListener('blur', function () {
          setTimeout(function () {
            if (dropdownEl) dropdownEl.classList.add('hidden');
          }, 150);
        });
      }
      if (backendEl && 'addEventListener' in backendEl) {
        backendEl.addEventListener('change', saveStateFromForm);
      }
      if (modelEl && 'addEventListener' in modelEl) {
        modelEl.addEventListener('input', saveStateFromForm);
      }
      if (modeEl && 'addEventListener' in modeEl) {
        modeEl.addEventListener('change', saveStateFromForm);
      }

      if (form) {
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          saveStateFromForm();

          const current = readFormState();
          vscode.postMessage({
            command: 'runQuery',
            data: {
              prompt: current.prompt,
              contexts: current.contexts,
              backend: current.backend,
              model: current.model,
              temperature: current.temperature,
              mode: current.mode
            }
          });
        });
      }

      window.addEventListener('message', function (event) {
        const message = event.data;
        if (!message) return;
        if (message.command === 'hydrate' || message.command === 'suggestions') {
          if (Array.isArray(message.suggestions)) {
            suggestionPool = message.suggestions;
            renderSuggestions(getFilterToken());
          }
        }
      });

      document.querySelectorAll('.copy').forEach(function (button) {
        button.addEventListener('click', function () {
          const index = Number(button.getAttribute('data-index'));
          vscode.postMessage({ command: 'copy', index: index });
        });
      });
      document.querySelectorAll('.open-file').forEach(function (button) {
        button.addEventListener('click', function () {
          const index = Number(button.getAttribute('data-index'));
          vscode.postMessage({ command: 'openFile', index: index });
        });
      });
    })();
  </script>
</body>
</html>`;
  }

  addResponse(result: QueryResult) {
    result.filePath = extractFilePath(result.response);
    responseHistory.push(result);
    if (responseHistory.length > MAX_HISTORY) {
      responseHistory.splice(0, responseHistory.length - MAX_HISTORY);
    }
    persistState();
    this.refresh();
  }

  refresh() {
    if (this.view) {
      this.view.webview.html = this.getHtml(this.view.webview);
      this.postState();
    }
  }

  reveal() {
    this.view?.show?.(true);
  }
}
