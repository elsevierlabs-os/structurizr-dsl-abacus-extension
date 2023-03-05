import * as vscode from 'vscode';

const path = require('path');

export class DrawioPanel {
    /**
	 * Track the current panel. Only allow a single panel to exist at a time.
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
				console.log(`DrawioPanel received a view state changed notification: ${e.webviewPanel.title}`);
				if (this._panel.visible) {
					// this._panel.webview.html = this.getOnlineHtml();
					console.log("Panel visible");
				} else {
					console.log("Panel hidden");
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		// In the future it would be fantastic if we can borrow the code link feature of the draw.io plugin so that selecting items in the drawing selects
		// the structurizr element https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio
		this._panel.webview.onDidReceiveMessage(
			async message => {
				console.log("DrawioPanel received a message: " + message); // {"event" : "init"} first message sent from draw.io
				const msg = JSON.parse(message);
				switch (msg.command) {
					case 'alert':
						vscode.window.showErrorMessage(message.text);
						return;
				}
				switch (msg.event) {
					case 'init':
						console.log(`Event received of type: ${JSON.stringify(msg.event)}`);
						// vscode.window.showErrorMessage(JSON.stringify(msg.event));
						var res = await this._panel.webview.postMessage(JSON.stringify({ action : 'load', xml: this.getSampleXml() }));
						return;
						// See https://github.com/jgraph/drawio-integration/blob/master/inline.js on posting a message to draw.io. Need to adjust to match vscode webview expectations
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

	getSampleXml() : string {
		return `<?xml version="1.0" encoding="UTF-8"?>
		<mxfile host="app.diagrams.net" modified="2023-03-03T20:02:25.591Z" agent="5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36 Edg/111.0.0.0" etag="-hW2f_RAXeajE4h-zvvO" version="21.0.2">
		  <diagram name="Page-1" id="TGXveLmL1LbJEgDd1sux">
			<mxGraphModel dx="1387" dy="804" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
			  <root>
				<mxCell id="0" />
				<mxCell id="1" parent="0" />
				<mxCell id="2AyjuID5S5YfO748b1Fw-1" value="" style="rounded=0;whiteSpace=wrap;html=1;" vertex="1" parent="1">
				  <mxGeometry x="354" y="555" width="120" height="60" as="geometry" />
				</mxCell>
			  </root>
			</mxGraphModel>
		  </diagram>
		</mxfile>`;
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