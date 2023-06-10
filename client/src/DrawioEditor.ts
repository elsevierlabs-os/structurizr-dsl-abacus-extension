import * as vscode from 'vscode';

/**
 * This is a wrapper around the diagrams.net DrawIO editor so that we can edit
 * diagrams saved in the MXFile XML format with the extension .drawio
 * 
 * See https://drawio.freshdesk.com/support/solutions/articles/16000042544-embed-mode for more detail
 * 
 */

export class DrawioEditorProvider implements vscode.CustomTextEditorProvider {

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new DrawioEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(DrawioEditorProvider.viewType, provider);
        return providerRegistration;
    }

    private static readonly viewType = 'drawio.editorUI';
    private skipChangeTextEventDueToSave = false;
    private skipNextDocumentUpdate = false;

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
                autosave: true,
                xml: document.getText(),
            }));
        }

        // If the document is saved to disk from this doc, ignore next change event
        vscode.workspace.onWillSaveTextDocument(() => {
            console.log('Responding to file save event.');
            this.skipChangeTextEventDueToSave = true;
        });

        // Hook up event handler so that we can sync the webview with the text document.
        // A quick hack to avoid responding to our own document changes
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            console.log('Responding to document change event.');
            if (e.document.uri.toString() === document.uri.toString()){
                if (this.skipChangeTextEventDueToSave){
                    this.skipChangeTextEventDueToSave = false;
                } else {
                    if (this.skipNextDocumentUpdate){
                        this.skipNextDocumentUpdate = false;
                    } else {
                        if (e.contentChanges.length > 0) {
                            updateWebview();
                        }
                    }
                }
            }
        });

        // Make sure we get rid of the listener when the editor is closed
        webviewPanel.onDidDispose(() => {
            console.log("DrawioEditor has been told it is going to be disposed. Or has it already?");
            changeDocumentSubscription.dispose();
        });

        // Receive messages from the webview
        // In the future it would be fantastic if we can borrow the code link feature of the draw.io plugin so that selecting items in the drawing selects
		// the structurizr element https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio
        webviewPanel.webview.onDidReceiveMessage(message => {
            // console.log("DrawioEditor received a message: " + message); // {"event" : "init"} first message sent from draw.io
            const msg = JSON.parse(message);
            switch (msg.command) {
                case 'alert':
                    vscode.window.showErrorMessage(msg.text);
                    return;
            }
            switch (msg.event) {
                case 'init':
                    console.log(`DrawioEditor Event received of type: ${JSON.stringify(msg.event)}`);
                    // We want to load the editor with the relevant Drawio XML payload
                    updateWebview();
                    return;
                    // See https://github.com/jgraph/drawio-integration/blob/master/inline.js on posting a message to draw.io. Need to adjust to match vscode webview expectations
                case 'load':
                    console.log(`DrawioEditor Event received of type: ${JSON.stringify(msg.event)}`);
                    return;
                case 'autosave':
                    console.log(`DrawioEditor Event received of type: ${JSON.stringify(msg.event)}`);
                    this.updateTextDocument(document, msg.xml);
                    return;
                case 'save':
                    console.log(`DrawioEditor Event received of type: ${JSON.stringify(msg.event)}`);
                    // Not sure this will ever get called. Autosave is called on every edit of the diagram
                    return;
            }
        });
    }

    updateTextDocument(document: vscode.TextDocument, xml: string) {
        console.log('*** UPDATE DRAWIO DOC ***');
        // console.log(xml);
        this.skipNextDocumentUpdate = true;
        const edit = new vscode.WorkspaceEdit();
        // Replace whole doc
        edit.replace(
            document.uri,
            new vscode.Range(0,0, document.lineCount, 0),
            xml
        );
        return vscode.workspace.applyEdit(edit);
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
				<iframe src="https://embed.diagrams.net?embed=1&proto=json&noSaveBtn=1&noExitBtn=1&saveAndExit=0"></iframe>
			</body>
		</html>
        `;
	}

    
}