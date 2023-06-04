import * as vscode from 'vscode';

/**
 * This is a wrapper around the diagrams.net DrawIO editor so that we can edit
 * diagrams saved in the MXFile XML format with the extension .drawio
 * 
 */

export class DrawioEditorProvider implements vscode.CustomTextEditorProvider {

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new DrawioEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(DrawioEditorProvider.viewType, provider);
        return providerRegistration;
    }

    private static readonly viewType = 'drawio.editorUI';

    constructor(
        private readonly context: vscode.ExtensionContext
    ) {}

    // Called when our DrawIO editor is opened
    public async resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
        };
        webviewPanel.webview.html = this.getOnlineHtml();

        function updateWebview() {
            webviewPanel.webview.postMessage(JSON.stringify({
                action: 'load',
                xml: document.getText(),
            }));
        }

        // Hook up event handlers so that we can sync the webview with the text document.
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()){
                updateWebview();
            }
        });

        // Make sure we get rid of the listener when the editor is closed
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });

        // Receive messages from the webview
        // In the future it would be fantastic if we can borrow the code link feature of the draw.io plugin so that selecting items in the drawing selects
		// the structurizr element https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio
        webviewPanel.webview.onDidReceiveMessage(message => {
            console.log("DrawioEditor received a message: " + message); // {"event" : "init"} first message sent from draw.io
            const msg = JSON.parse(message);
            switch (msg.command) {
                case 'alert':
                    vscode.window.showErrorMessage(msg.text);
                    return;
            }
            switch (msg.event) {
                case 'init':
                    console.log(`Event received of type: ${JSON.stringify(msg.event)}`);
                    // vscode.window.showErrorMessage(JSON.stringify(msg.event));
                    // We want to load the editor with the relevant Drawio XML payload
                    // var res = await this._panel.webview.postMessage(JSON.stringify({ action : 'load', xml: this.getSampleXml() }));
                    updateWebview();
                    return;
                    // See https://github.com/jgraph/drawio-integration/blob/master/inline.js on posting a message to draw.io. Need to adjust to match vscode webview expectations
                case 'load':
                    console.log(`Event received of type: ${JSON.stringify(msg.event)}`);
                    return;
                case 'save':
                    console.log(`Event received of type: ${JSON.stringify(msg.event)}`);
                    return;
            }
        });

        // I assume we wait for the init event before we push content to the editor
        // updateWebview();
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

    
}