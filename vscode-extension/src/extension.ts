// import * as vscode from 'vscode';
// import * as cp from 'child_process';
// import * as path from 'path';
// import * as fs from 'fs';

// const responseHistory: QueryResult[] = [];
// let chatViewProvider: ChatViewProvider | undefined;
// let formState: FormState = {
//   prompt: '',
//   context: '',
//   backend: 'langgraph',
//   model: 'codellama:7b-code-q4_K_M',
//   temperature: 0.1,
//   mode: 'assistant'
// };

// interface QueryResult {
//   response: string;
//   cwd: string;
//   filePath?: string;
//   timestamp: number;
//   prompt: string;
//   context?: string;
//   backend: string;
//   model: string;
//   temperature?: number;
//   mode: string;
// }

// function getConfig() {
//   const config = vscode.workspace.getConfiguration('localCodeAssistant');
//   const pythonDefault = process.platform === 'win32' ? 'python' : 'python3';
//   return {
//     pythonPath: config.get<string>('pythonPath', pythonDefault),
//     cliPath: config.get<string>('cliPath', 'scripts/cli/langgraph_agent.py'),
//     backend: config.get<string>('backend', 'langgraph'),
//     model: config.get<string>('model', 'codellama:7b-code-q4_K_M'),
//     workingDirectory: config.get<string>('workingDirectory', '')
//   };
// }

// interface QueryOverrides {
//   backend?: string;
//   model?: string;
//   context?: string;
//   temperature?: number;
//   mode?: string;
// }

// interface FormMessage {
//   prompt: string;
//   context?: string;
//   backend?: string;
//   model?: string;
//   temperature?: number;
//   mode?: string;
// }

// interface FormState {
//   prompt: string;
//   context: string;
//   backend: string;
//   model: string;
//   temperature: number;
//   mode: string;
// }

// async function runQuery(query: string, output: vscode.OutputChannel, overrides?: QueryOverrides): Promise<QueryResult | null> {
//   const config = getConfig();
//   const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

//   if (!workspaceFolder) {
//     vscode.window.showErrorMessage('Open a folder containing the Local Code Assistant project before running the command.');
//     return null;
//   }

//   const cwd = config.workingDirectory
//     ? config.workingDirectory
//     : workspaceFolder.uri.fsPath;
//   const resolvedCliPath = path.isAbsolute(config.cliPath)
//     ? config.cliPath
//     : path.join(cwd, config.cliPath);

//   if (!fs.existsSync(resolvedCliPath)) {
//     vscode.window.showErrorMessage(`LangGraph CLI not found at ${resolvedCliPath}`);
//     return null;
//   }

//   const backend = overrides?.backend ?? config.backend;
//   const model = overrides?.model ?? config.model;
//   const temperature = overrides?.temperature ?? undefined;
//   const contextOverride = overrides?.context ?? null;
//   const mode = overrides?.mode ?? 'assistant';

//   output.appendLine(`Running local agent (${backend}) with model '${model}'...`);
//   const args = [
//     resolvedCliPath,
//     '--backend',
//     backend,
//     '--model',
//     model,
//     '--json'
//   ];
//   if (typeof temperature === 'number') {
//     args.push('--temperature', temperature.toString());
//   }
//   if (contextOverride && contextOverride.trim().length > 0) {
//     args.push('--context', contextOverride);
//   }
//   args.push(query);

//   return new Promise<QueryResult>((resolve, reject) => {
//     const child = cp.spawn(config.pythonPath, args, { cwd });
//     let stdout = '';
//     let stderr = '';

//     child.stdout.on('data', (data) => {
//       stdout += data.toString();
//     });

//     child.stderr.on('data', (data) => {
//       const chunk = data.toString();
//       stderr += chunk;
//       output.append(chunk);
//     });

//     child.on('close', (code) => {
//       if (code !== 0) {
//         const error = new Error(`Local agent exited with code ${code}`);
//         if (stderr) {
//           output.appendLine(stderr);
//         }
//         return reject(error);
//       }

//       const jsonLine = stdout.trim().split('\n').filter(Boolean).pop() ?? '';
//       try {
//         const payload = JSON.parse(jsonLine);
//         const response = payload.response ?? payload.error ?? stdout.trim();
//         output.appendLine(response);
//         vscode.window.showInformationMessage('Local agent response received.');
//         resolve({
//           response,
//           cwd,
//           timestamp: Date.now(),
//           prompt: query,
//           context: contextOverride || undefined,
//           backend,
//           model,
//           temperature,
//           mode
//         });
//       } catch (error) {
//         output.appendLine('Raw output:');
//         output.appendLine(stdout);
//         reject(new Error('Failed to parse agent output. Check the output channel for details.'));
//       }
//     });
//   });
// }

// export function activate(context: vscode.ExtensionContext) {
//   const outputChannel = vscode.window.createOutputChannel('Local Code Assistant');
//   outputChannel.appendLine('[local-code-assistant] Extension activated');

//   const baseConfig = getConfig();
//   formState.backend = baseConfig.backend;
//   formState.model = baseConfig.model;

//   const handleSubmit = async (data: FormMessage) => {
//     const prompt = data.prompt?.trim();
//     if (!prompt) {
//       vscode.window.showWarningMessage('Please enter a prompt.');
//       return;
//     }

//     formState = {
//       prompt,
//       context: data.context ?? '',
//       backend: data.backend ?? baseConfig.backend,
//       model: data.model ?? baseConfig.model,
//       temperature: typeof data.temperature === 'number' ? data.temperature : (formState.temperature ?? 0.1),
//       mode: data.mode ?? formState.mode
//     };

//     try {
//       const result = await vscode.window.withProgress(
//         {
//           location: vscode.ProgressLocation.Notification,
//           title: 'Local Code Assistant',
//           cancellable: false
//         },
//         async () => runQuery(prompt, outputChannel, {
//           backend: data.backend,
//           model: data.model,
//           temperature: data.temperature,
//           context: data.context,
//           mode: data.mode
//         })
//       );

//       if (!result) {
//         return;
//       }

//       chatViewProvider?.addResponse(result);
//       outputChannel.show(true);
//     } catch (error) {
//       vscode.window.showErrorMessage(String(error));
//     }
//   };

//   chatViewProvider = new ChatViewProvider(context.extensionUri, handleSubmit);
//   context.subscriptions.push(
//     vscode.window.registerWebviewViewProvider('localCodeAssistant.history', chatViewProvider)
//   );

//   const runQueryCommand = vscode.commands.registerCommand('localCodeAssistant.runQuery', async () => {
//     const query = await vscode.window.showInputBox({
//       prompt: 'Ask the local coding assistant',
//       placeHolder: "e.g. Create a file called hello.py that prints 'Hello'",
//       ignoreFocusOut: true
//     });

//     if (!query) {
//       return;
//     }

//     try {
//       const result = await vscode.window.withProgress(
//         {
//           location: vscode.ProgressLocation.Notification,
//           title: 'Local Code Assistant',
//           cancellable: false
//         },
//         async () => runQuery(query, outputChannel)
//       );
//       if (!result) {
//         return;
//       }
//       chatViewProvider?.addResponse(result);
//       outputChannel.show(true);
//     } catch (error) {
//       vscode.window.showErrorMessage(String(error));
//     }
//   });

//   const runSelectionCommand = vscode.commands.registerCommand('localCodeAssistant.runSelection', async () => {
//     const editor = vscode.window.activeTextEditor;
//     const selectedText = editor?.document.getText(editor.selection).trim() ?? '';

//     if (!selectedText) {
//       vscode.window.showWarningMessage('Select some code/text before running this command.');
//       return;
//     }

//     const instruction = await vscode.window.showInputBox({
//       prompt: 'Describe what you want done with the selected text (optional)',
//       placeHolder: 'e.g. Review this function',
//       ignoreFocusOut: true
//     });

//     const query = instruction
//       ? `${instruction}\n\nContext:\n${selectedText}`
//       : selectedText;

//     try {
//       const result = await vscode.window.withProgress(
//         {
//           location: vscode.ProgressLocation.Notification,
//           title: 'Local Code Assistant (Selection)',
//           cancellable: false
//         },
//         async () => runQuery(query, outputChannel)
//       );
//       if (!result) {
//         return;
//       }
//       chatViewProvider?.addResponse(result);
//       outputChannel.show(true);
//     } catch (error) {
//       vscode.window.showErrorMessage(String(error));
//     }
//   });

//   const openPanelCommand = vscode.commands.registerCommand('localCodeAssistant.openPanel', async () => {
//     if (!chatViewProvider) {
//       vscode.window.showInformationMessage('Sidebar not ready yet.');
//       return;
//     }
//     chatViewProvider.reveal();
//   });

//   context.subscriptions.push(runQueryCommand, runSelectionCommand, openPanelCommand, outputChannel);
// }

// export function deactivate() {
//   // Nothing to cleanup.
// }

// class ChatViewProvider implements vscode.WebviewViewProvider {
//   private view?: vscode.WebviewView;
//   constructor(private readonly extensionUri: vscode.Uri, private readonly submitHandler: (data: FormMessage) => void) {}

//   resolveWebviewView(
//     webviewView: vscode.WebviewView,
//     _context: vscode.WebviewViewResolveContext,
//     _token: vscode.CancellationToken
//   ) {
//     this.view = webviewView;
//     webviewView.webview.options = {
//       enableScripts: true,
//       localResourceRoots: [this.extensionUri]
//     };
//     webviewView.webview.html = this.getHtml(webviewView.webview);
//     this.postState();

//     webviewView.webview.onDidReceiveMessage(async (message) => {
//       if (message.command === 'runQuery') {
//         this.submitHandler(message.data as FormMessage);
//         return;
//       }
//       if (message.command === 'copy') {
//         const entry = responseHistory[message.index];
//         if (!entry) {
//           return;
//         }
//         await vscode.env.clipboard.writeText(entry.response);
//         vscode.window.showInformationMessage('Response copied to clipboard.');
//       }

//       if (message.command === 'openFile') {
//         const entry = responseHistory[message.index];
//         if (!entry?.filePath) {
//           vscode.window.showErrorMessage('No file path found for this response.');
//           return;
//         }
//         const resolvedPath = path.isAbsolute(entry.filePath)
//           ? entry.filePath
//           : path.join(entry.cwd, entry.filePath);
//         if (!fs.existsSync(resolvedPath)) {
//           vscode.window.showErrorMessage(`File not found: ${resolvedPath}`);
//           return;
//         }
//         try {
//           const doc = await vscode.workspace.openTextDocument(resolvedPath);
//           await vscode.window.showTextDocument(doc);
//         } catch (error) {
//           vscode.window.showErrorMessage(`Failed to open file: ${error}`);
//         }
//       }
//     });
//   }

//   private postState() {
//     if (!this.view) return;
//     const files = this.getWorkspaceFiles();
//     this.view.webview.postMessage({
//       command: 'hydrate',
//       formState,
//       suggestions: files
//     });
//   }

//   private getWorkspaceFiles(): string[] {
//     const folders = vscode.workspace.workspaceFolders;
//     if (!folders) return [];
//     const uris = vscode.workspace.findFiles('**/*', '**/{.git,node_modules,.venv}/**', 50);
//     // findFiles returns Thenable<Uri[]>; handle asynchronously
//     uris.then((list) => {
//       const rel = list.map((u) => vscode.workspace.asRelativePath(u, false));
//       if (this.view) {
//         this.view.webview.postMessage({ command: 'suggestions', suggestions: rel });
//       }
//     });
//     return [];
//   }

//   private getHtml(webview: vscode.Webview): string {
//     const config = getConfig();
//     const entries = responseHistory
//       .slice()
//       .reverse()
//       .map((entry, displayIndex) => {
//         const originalIndex = responseHistory.length - displayIndex - 1;
//         const escapedResponse = escapeHtml(entry.response);
//         const timestamp = new Date(entry.timestamp).toLocaleTimeString();
//         const openFileButton = entry.filePath
//           ? `<button data-index="${originalIndex}" class="open-file">Open ${escapeHtml(entry.filePath)}</button>`
//           : '';
//         return `<section class="entry">
//           <header>
//             <strong>Response ${responseHistory.length - displayIndex}</strong>
//             <span>${timestamp}</span>
//           </header>
//           <div class="actions">
//             <button data-index="${originalIndex}" class="copy">Copy</button>
//             ${openFileButton}
//           </div>
//           <pre><strong>You:</strong> ${escapeHtml(entry.prompt)}${entry.context ? `<br><em>Context:</em> ${escapeHtml(entry.context)}` : ''}\n\n<strong>Assistant:</strong> ${escapedResponse}</pre>
//         </section>`;
//       })
//       .join('\n');

//     const cspSource = webview.cspSource;
//     const defaultBackend = formState.backend ?? config.backend ?? 'langgraph';
//     const backendOptions = ['langgraph', 'simple']
//       .map(
//         (value) =>
//           `<option value="${value}" ${value === defaultBackend ? 'selected' : ''}>${value}</option>`
//       )
//       .join('');
//     const defaultModel = escapeHtml(formState.model || config.model || 'codellama:7b-code-q4_K_M');
//     const defaultTemp = typeof formState.temperature === 'number' ? formState.temperature : 0.1;
//     const defaultPrompt = escapeHtml(formState.prompt || '');
//     const defaultContext = escapeHtml(formState.context || '');
//     const defaultMode = formState.mode || 'assistant';

//     const modeOptions = ['assistant', 'agent']
//       .map((value) => `<option value="${value}" ${value === defaultMode ? 'selected' : ''}>${value}</option>`)
//       .join('');

//     return `<!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8">
//   <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource}; script-src ${cspSource}; style-src ${cspSource} 'unsafe-inline';">
//   <style>
//     body { font-family: sans-serif; padding: 1rem; color: #eee; background: #1e1e1e; }
//     form { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
//     textarea, select, input { width: 100%; padding: 0.4rem; border-radius: 4px; border: 1px solid #444; background: #2a2a2a; color: #eee; }
//     label { font-size: 0.9rem; }
//     button { background: #007acc; color: #fff; border: none; padding: 0.6rem 1rem; border-radius: 4px; cursor: pointer; }
//     button:hover { background: #1a85ff; }
//     pre { white-space: pre-wrap; background: #111; color: #eee; padding: 1rem; border-radius: 4px; }
//     button { margin-right: 0.5rem; }
//     .entry { border-bottom: 1px solid #333; padding-bottom: 1rem; margin-bottom: 1rem; }
//     header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
//     .actions button { margin-top: 0.25rem; }
//     .controls-row { display: flex; gap: 0.5rem; align-items: center; }
//     .controls-row label { flex: 1; }
//     .temperature-display { font-variant-numeric: tabular-nums; margin-left: 0.5rem; }
//   </style>
// </head>
// <body>
//   <h2>Local Code Assistant</h2>
//   <form id="assistant-form">
//     <label>
//       Prompt
//       <textarea id="prompt" rows="3" placeholder="Ask the assistant...">${defaultPrompt}</textarea>
//     </label>
//     <label>
//       Context (optional)
//       <textarea id="context" rows="2" list="context-suggestions" placeholder="Add system context or file summary...">${defaultContext}</textarea>
//       <datalist id="context-suggestions"></datalist>
//     </label>
//     <div class="controls-row">
//       <label>Backend
//         <select id="backend">${backendOptions}</select>
//       </label>
//       <label>Model
//         <input id="model" value="${defaultModel}" />
//       </label>
//     </div>
//     <div class="controls-row">
//       <label>Mode
//         <select id="mode">${modeOptions}</select>
//       </label>
//     </div>
//     <div class="controls-row">
//       <label>Temperature
//         <input type="range" id="temperature" min="0" max="1" step="0.05" value="${defaultTemp}" />
//       </label>
//       <span class="temperature-display" id="temperature-label">${defaultTemp.toFixed(2)}</span>
//     </div>
//     <button type="submit">Run</button>
//   </form>
//   <section id="responses">
//     ${entries || '<p>No responses yet. Submit a prompt to begin.</p>'}
//   </section>
//   <script>
//     const vscode = acquireVsCodeApi();
//     const form = document.getElementById('assistant-form');
//     const tempSlider = document.getElementById('temperature');
//     const tempLabel = document.getElementById('temperature-label');
//     tempSlider?.addEventListener('input', () => {
//       tempLabel.textContent = Number(tempSlider.value).toFixed(2);
//     });
//     form?.addEventListener('submit', (event) => {
//       event.preventDefault();
//       const prompt = document.getElementById('prompt').value;
//       const context = document.getElementById('context').value;
//       const backend = document.getElementById('backend').value;
//       const model = document.getElementById('model').value;
//       const temperature = Number(document.getElementById('temperature').value);
//       const mode = document.getElementById('mode').value;
//       vscode.postMessage({
//         command: 'runQuery',
//         data: { prompt, context, backend, model, temperature, mode }
//       });
//     });
//     window.addEventListener('message', (event) => {
//       const message = event.data;
//       if (!message) return;
//       if (message.command === 'hydrate' || message.command === 'suggestions') {
//         const list = document.getElementById('context-suggestions');
//         if (list && Array.isArray(message.suggestions)) {
//           list.innerHTML = message.suggestions
//             .map((item) => '<option value="' + item + '"></option>')
//             .join('');
//         }
//       }
//     });
//     document.querySelectorAll('.copy').forEach((button) => {
//       button.addEventListener('click', () => {
//         const index = Number(button.getAttribute('data-index'));
//         vscode.postMessage({ command: 'copy', index });
//       });
//     });
//     document.querySelectorAll('.open-file').forEach((button) => {
//       button.addEventListener('click', () => {
//         const index = Number(button.getAttribute('data-index'));
//         vscode.postMessage({ command: 'openFile', index });
//       });
//     });
//   </script>
// </body>
// </html>`;
//   }

//   addResponse(result: QueryResult) {
//     result.filePath = extractFilePath(result.response);
//     responseHistory.push(result);
//     if (responseHistory.length > 10) {
//       responseHistory.shift();
//     }
//     this.refresh();
//   }

//   refresh() {
//     if (this.view) {
//       this.view.webview.html = this.getHtml(this.view.webview);
//       this.postState();
//     }
//   }

//   reveal() {
//     this.view?.show?.(true);
//   }
// }

// function extractFilePath(response: string): string | undefined {
//   const match = response.match(/Successfully wrote to '([^']+)'/);
//   return match ? match[1] : undefined;
// }

// function getWebviewContent(webview: vscode.Webview, history: QueryResult[]): string {
//   const entries = history
//     .slice()
//     .reverse()
//     .map((entry, displayIndex) => {
//       const originalIndex = history.length - displayIndex - 1;
//       const escapedResponse = escapeHtml(entry.response);
//       const timestamp = new Date(entry.timestamp).toLocaleTimeString();
//       const openFileButton = entry.filePath
//         ? `<button data-index="${originalIndex}" class="open-file">Open ${escapeHtml(entry.filePath)}</button>`
//         : '';
//       return `<section class="entry">
//         <header>
//           <strong>Response ${history.length - displayIndex}</strong>
//           <span>${timestamp}</span>
//         </header>
//         <div class="actions">
//           <button data-index="${originalIndex}" class="copy">Copy</button>
//           ${openFileButton}
//         </div>
//         <pre>${escapedResponse}</pre>
//       </section>`;
//     })
//     .join('\n');

//   return `<!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8">
//   <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${webview.cspSource}; style-src ${webview.cspSource};">
//   <style>
//     body { font-family: sans-serif; padding: 1rem; }
//     pre { white-space: pre-wrap; background: #111; color: #eee; padding: 1rem; border-radius: 4px; }
//     button { margin-right: 0.5rem; }
//     .entry { border-bottom: 1px solid #333; padding-bottom: 1rem; margin-bottom: 1rem; }
//     header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
//   </style>
// </head>
// <body>
//   <h2>Local Code Assistant Responses</h2>
//   ${entries || '<p>No responses yet.</p>'}
//   <script>
//     const vscode = acquireVsCodeApi();
//     document.querySelectorAll('.copy').forEach((button) => {
//       button.addEventListener('click', () => {
//         const index = Number(button.getAttribute('data-index'));
//         vscode.postMessage({ command: 'copy', index });
//       });
//     });
//     document.querySelectorAll('.open-file').forEach((button) => {
//       button.addEventListener('click', () => {
//         const index = Number(button.getAttribute('data-index'));
//         vscode.postMessage({ command: 'openFile', index });
//       });
//     });
//   </script>
// </body>
// </html>`;
// }

// function escapeHtml(value: string): string {
//   return value
//     .replace(/&/g, '&amp;')
//     .replace(/</g, '&lt;')
//     .replace(/>/g, '&gt;')
//     .replace(/"/g, '&quot;')
//     .replace(/'/g, '&#39;');
// }

///////////////////////////////////////////////////////////////////////////////////////////////////

import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const responseHistory: QueryResult[] = [];
let chatViewProvider: ChatViewProvider | undefined;
let formState: FormState = {
  prompt: '',
  context: '',
  backend: 'langgraph',
  model: 'codellama:7b-code-q4_K_M',
  temperature: 0.1,
  mode: 'assistant'
};
const MAX_HISTORY = 20;
const STORAGE_KEY = 'localCodeAssistant.state';
let extContext: vscode.ExtensionContext;
const MAX_HISTORY = 20;

interface QueryResult {
  response: string;
  cwd: string;
  filePath?: string;
  timestamp: number;
  prompt: string;
  context?: string;
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

interface QueryOverrides {
  backend?: string;
  model?: string;
  context?: string;
  temperature?: number;
  mode?: string;
}

interface FormMessage {
  prompt: string;
  context?: string;
  backend?: string;
  model?: string;
  temperature?: number;
  mode?: string;
}

interface FormState {
  prompt: string;
  context: string;
  backend: string;
  model: string;
  temperature: number;
  mode: string;
}

interface PersistedState {
  form: FormState;
  history: QueryResult[];
}

async function runQuery(
  query: string,
  output: vscode.OutputChannel,
  overrides?: QueryOverrides
): Promise<QueryResult | null> {
  const config = getConfig();
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    vscode.window.showErrorMessage(
      'Open a folder containing the Local Code Assistant project before running the command.'
    );
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

  const mode = overrides?.mode ?? formState.mode ?? 'assistant';
  const backend =
    mode === 'agent'
      ? 'langgraph'
      : overrides?.backend ?? formState.backend ?? config.backend;
  const model = overrides?.model ?? formState.model ?? config.model;
  const temperature = overrides?.temperature ?? formState.temperature;
  const contextOverride = overrides?.context ?? null;

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
          context: contextOverride || undefined,
          backend,
          model,
          temperature,
          mode,
          usage
        });
      } catch (error) {
        output.appendLine('Raw output:');
        output.appendLine(stdout);
        reject(
          new Error('Failed to parse agent output. Check the output channel for details.')
        );
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
      context: data.context ?? '',
      backend: data.backend ?? baseConfig.backend,
      model: data.model ?? baseConfig.model,
      temperature:
        typeof data.temperature === 'number'
          ? data.temperature
          : formState.temperature ?? 0.1,
      mode: data.mode ?? formState.mode
    };

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
            context: data.context,
            mode: data.mode
          })
      );

      if (!result) {
        return;
      }

      chatViewProvider?.addResponse(result);
      outputChannel.show(true);
    } catch (error) {
      vscode.window.showErrorMessage(String(error));
    }
  };

  chatViewProvider = new ChatViewProvider(context.extensionUri, handleSubmit);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'localCodeAssistant.history',
      chatViewProvider
    )
  );

  const runQueryCommand = vscode.commands.registerCommand(
    'localCodeAssistant.runQuery',
    async () => {
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
        chatViewProvider?.addResponse(result);
        outputChannel.show(true);
      } catch (error) {
        vscode.window.showErrorMessage(String(error));
      }
    }
  );

  const runSelectionCommand = vscode.commands.registerCommand(
    'localCodeAssistant.runSelection',
    async () => {
      const editor = vscode.window.activeTextEditor;
      const selectedText =
        editor?.document.getText(editor.selection).trim() ?? '';

      if (!selectedText) {
        vscode.window.showWarningMessage(
          'Select some code/text before running this command.'
        );
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
        chatViewProvider?.addResponse(result);
        outputChannel.show(true);
      } catch (error) {
        vscode.window.showErrorMessage(String(error));
      }
    }
  );

  const openPanelCommand = vscode.commands.registerCommand(
    'localCodeAssistant.openPanel',
    async () => {
      if (!chatViewProvider) {
        vscode.window.showInformationMessage('Sidebar not ready yet.');
        return;
      }
      chatViewProvider.reveal();
    }
  );

  context.subscriptions.push(
    runQueryCommand,
    runSelectionCommand,
    openPanelCommand,
    outputChannel
  );
}

export function deactivate() {
  // Nothing to cleanup.
}

class ChatViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly submitHandler: (data: FormMessage) => void
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
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

  private postState() {
    if (!this.view) return;
    const files = this.getWorkspaceFiles();
    this.view.webview.postMessage({
      command: 'hydrate',
      formState,
      suggestions: files
    });
  }

  private getWorkspaceFiles(): string[] {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) return [];
    const uris = vscode.workspace.findFiles(
      '**/*',
      '**/{.git,node_modules,.venv}/**',
      50
    );
    // findFiles returns Thenable<Uri[]>; handle asynchronously
    uris.then((list) => {
      const rel = list.map((u) => vscode.workspace.asRelativePath(u, false));
      if (this.view) {
        this.view.webview.postMessage({
          command: 'suggestions',
          suggestions: rel
        });
      }
    });
    return [];
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
          ? `<button data-index="${originalIndex}" class="open-file">Open ${escapeHtml(
              entry.filePath
            )}</button>`
          : '';
        return `<section class="entry">
          <header>
            <strong>Response ${
              responseHistory.length - displayIndex
            }</strong>
            <span>${timestamp}</span>
          </header>
          <div class="actions">
            <button data-index="${originalIndex}" class="copy">Copy</button>
            ${openFileButton}
          </div>
          <pre><strong>You:</strong> ${escapeHtml(entry.prompt)}${
            entry.context
              ? `<br><em>Context:</em> ${escapeHtml(entry.context)}`
              : ''
          }\n\n<strong>Assistant:</strong> ${escapedResponse}</pre>
        </section>`;
      })
      .join('\n');

    const cspSource = webview.cspSource;
    const defaultBackend = formState.backend ?? config.backend ?? 'langgraph';
    const backendOptions = ['langgraph', 'simple']
      .map(
        (value) =>
          `<option value="${value}" ${
            value === defaultBackend ? 'selected' : ''
          }>${value}</option>`
      )
      .join('');
    const defaultModel = escapeHtml(
      formState.model || config.model || 'codellama:7b-code-q4_K_M'
    );
    const defaultTemp =
      typeof formState.temperature === 'number' ? formState.temperature : 0.1;
    const defaultPrompt = escapeHtml(formState.prompt || '');
    const defaultContext = escapeHtml(formState.context || '');
    const defaultMode = formState.mode || 'assistant';

    const modeOptions = ['assistant', 'agent']
      .map(
        (value) =>
          `<option value="${value}" ${
            value === defaultMode ? 'selected' : ''
          }>${value}</option>`
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <!-- Allow inline script so our webview JS actually runs -->
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 img-src ${cspSource};
                 script-src 'unsafe-inline';
                 style-src ${cspSource} 'unsafe-inline';">
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
      <span class="temperature-display" id="temperature-label">${defaultTemp.toFixed(
        2
      )}</span>
    </div>
    <button type="submit">Run</button>
  </form>
  <section id="responses">
    ${
      entries || '<p>No responses yet. Submit a prompt to begin.</p>'
    }
  </section>
  <script>
    (function () {
      const vscode = acquireVsCodeApi();

      const form = document.getElementById('assistant-form');
      const promptEl = document.getElementById('prompt');
      const contextEl = document.getElementById('context');
      const backendEl = document.getElementById('backend');
      const modelEl = document.getElementById('model');
      const modeEl = document.getElementById('mode');
      const tempSlider = document.getElementById('temperature');
      const tempLabel = document.getElementById('temperature-label');

      function readFormState() {
        return {
          prompt: promptEl && 'value' in promptEl ? promptEl.value : '',
          context: contextEl && 'value' in contextEl ? contextEl.value : '',
          backend: backendEl && 'value' in backendEl ? backendEl.value : 'langgraph',
          model: modelEl && 'value' in modelEl ? modelEl.value : '',
          temperature: tempSlider && 'value' in tempSlider ? Number(tempSlider.value) : 0.1,
          mode: modeEl && 'value' in modeEl ? modeEl.value : 'assistant'
        };
      }

      // Restore state from previous session if available
      var state = vscode.getState() || readFormState();

      function applyStateToForm() {
        if (promptEl && 'value' in promptEl) promptEl.value = state.prompt || '';
        if (contextEl && 'value' in contextEl) contextEl.value = state.context || '';
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
        contextEl.addEventListener('input', saveStateFromForm);
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
              context: current.context,
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
          const list = document.getElementById('context-suggestions');
          if (list && Array.isArray(message.suggestions)) {
            list.innerHTML = message.suggestions
              .map(function (item) { return '<option value="' + item + '"></option>'; })
              .join('');
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
    this.view?.show?.(true);
  }
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
        ? `<button data-index="${originalIndex}" class="open-file">Open ${escapeHtml(
            entry.filePath
          )}</button>`
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
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 script-src 'unsafe-inline';
                 style-src ${webview.cspSource} 'unsafe-inline';">
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
