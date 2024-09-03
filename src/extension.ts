// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('quarkdown-vscode.preview', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const document = editor.document;
			const filePath = document.fileName;

			const scriptPath = path.join(context.extensionPath, 'resources', 'quarkdown', 'bin', 'quarkdown');
			const outputDir = '/tmp/quarkdown/';
			if (!fs.existsSync(outputDir)) {
				fs.mkdirSync(outputDir);
			}

			exec(`${scriptPath} ${filePath} -o ${outputDir}`, (error, stdout, stderr) => {
				if (error) {
					vscode.window.showErrorMessage(`Error: ${stderr}`);
					return;
				}

				const indexPath = path.join(outputDir, 'Untitled-Quarkdown-Document/index.html');
				const themePath = path.join(outputDir, 'Untitled-Quarkdown-Document/theme');

				fs.readFile(indexPath, 'utf8', (err, data) => {
					if (err) {
						vscode.window.showErrorMessage(`Error reading index.html: ${err.message}`);
						return;
					}

					const panel = vscode.window.createWebviewPanel(
						'quarkdownPreview',
						'Quarkdown Preview',
						vscode.ViewColumn.Two,
						{
							enableScripts: true,
							localResourceRoots: [vscode.Uri.file(outputDir)]
						}
					);

					const themeUri = panel.webview.asWebviewUri(vscode.Uri.file(themePath));
					const htmlContent = data.replace(/href="theme/g, `href="${themeUri}`);

					panel.webview.html = htmlContent;

					// Listen for scroll events in the editor
					vscode.window.onDidChangeTextEditorVisibleRanges(event => {
						if (event.textEditor === editor) {
							const firstVisibleLine = event.visibleRanges[0].start.line;
							panel.webview.postMessage({ command: 'scroll', line: firstVisibleLine });
						}
					});

					// Handle messages from the webview
					panel.webview.onDidReceiveMessage(message => {
						switch (message.command) {
							case 'scroll':
								const line = message.line;
								const range = new vscode.Range(line, 0, line, 0);
								editor.revealRange(range, vscode.TextEditorRevealType.AtTop);
								break;
						}
					});
				});
			});
		}
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
