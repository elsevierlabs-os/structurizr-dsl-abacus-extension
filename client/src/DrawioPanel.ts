import * as vscode from 'vscode';

const path = require('path');

export class DrawioPanel {
    /**
	 * Track the currentl panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: DrawioPanel | undefined;
	public static readonly viewType = 'drawioPreview';
	private readonly _panel: vscode.WebviewPanel;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(context: vscode.ExtensionContext) {
		
		// If we already have a panel, show it.
		if (DrawioPanel.currentPanel) {
			DrawioPanel.currentPanel._panel.reveal(vscode.ViewColumn.Two);
			return;
		}

		let title = path.basename(vscode.window.activeTextEditor.document.uri.fsPath) + ' [Preview]';
		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			DrawioPanel.viewType, 
			title, 
			vscode.ViewColumn.Two, 
			{ enableScripts: true, retainContextWhenHidden: true }
		);

		DrawioPanel.currentPanel = new DrawioPanel(panel);
	}

	private constructor(panel: vscode.WebviewPanel) {
		this._panel = panel;

		// Set the webview's initial html content
		this._panel.webview.html = this.getOnlineHtml();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programmatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes - this may be a bad idea so will comment out for now
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					// this._panel.webview.html = this.getOnlineHtml();
					console.log("DrawioPanel received a view state changed notification.");
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				console.log("DrawioPanel received a message: " + message); // {"event" : "init"} first message sent from draw.io
				switch (message.command) {
					case 'alert':
						vscode.window.showErrorMessage(message.text);
						return;
				}
			},
			null,
			this._disposables
		);
	}
	getOnlineHtml(): string {
		return `
        <html>
			<head>
			<meta charset="UTF-8">
			<meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline'; worker-src * data: 'unsafe-inline' 'unsafe-eval'; font-src * 'unsafe-inline' 'unsafe-eval';">
			<style>
				html { height: 100%; width: 100%; padding: 0; margin: 0; }
				body { height: 100%; width: 100%; padding: 0; margin: 0; }
				iframe { height: 100%; width: 100%; padding: 0; margin: 0; border: 0; display: block; }
			</style>
			</head>
			<body>
				<script>
					const api = window.VsCodeApi = acquireVsCodeApi();
					window.addEventListener('message', event => {
						
						if (event.source === window.frames[0]) {
							console.log("frame -> vscode", event.data);
							api.postMessage(event.data);
						} else {
							console.log("vscode -> frame", event.data);
							window.frames[0].postMessage(event.data, "*");
						}
					});
				</script>
				<iframe src="https://embed.diagrams.net?embed=1&proto=json&noSaveBtn=1&noExitBtn=1"></iframe>
			</body>
		</html>
        `;
	}

	public dispose() {
		DrawioPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}
}