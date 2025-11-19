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
        return;
    }
    const cwd = config.workingDirectory
        ? config.workingDirectory
        : workspaceFolder.uri.fsPath;
    const resolvedCliPath = path.isAbsolute(config.cliPath)
        ? config.cliPath
        : path.join(cwd, config.cliPath);
    if (!fs.existsSync(resolvedCliPath)) {
        vscode.window.showErrorMessage(`LangGraph CLI not found at ${resolvedCliPath}`);
        return;
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
            vscode.window.showErrorMessage(`Local agent exited with code ${code}`);
            if (stderr) {
                output.appendLine(stderr);
            }
            return;
        }
        const jsonLine = (_a = stdout.trim().split('\n').filter(Boolean).pop()) !== null && _a !== void 0 ? _a : '';
        try {
            const payload = JSON.parse(jsonLine);
            const response = (_c = (_b = payload.response) !== null && _b !== void 0 ? _b : payload.error) !== null && _c !== void 0 ? _c : stdout.trim();
            output.appendLine(response);
            vscode.window.showInformationMessage('Local agent response received.');
            vscode.window.showInformationMessage(response);
        }
        catch (error) {
            vscode.window.showErrorMessage('Failed to parse agent output. Check the output channel for details.');
            output.appendLine('Raw output:');
            output.appendLine(stdout);
        }
    });
}
function activate(context) {
    const outputChannel = vscode.window.createOutputChannel('Local Code Assistant');
    const disposable = vscode.commands.registerCommand('localCodeAssistant.runQuery', async () => {
        const query = await vscode.window.showInputBox({
            prompt: 'Ask the local coding assistant',
            placeHolder: "e.g. Create a file called hello.py that prints 'Hello'",
            ignoreFocusOut: true
        });
        if (!query) {
            return;
        }
        await runQuery(query, outputChannel);
        outputChannel.show(true);
    });
    context.subscriptions.push(disposable, outputChannel);
}
function deactivate() {
    // Nothing to cleanup.
}
//# sourceMappingURL=extension.js.map