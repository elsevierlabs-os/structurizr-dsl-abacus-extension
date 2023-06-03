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
        webviewPanel.webview.html = '<H1>Hello World</H1>';

        function updateWebview() {
            webviewPanel.webview.postMessage({
                type: 'update',
                text: document.getText(),
            });
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
        webviewPanel.webview.onDidReceiveMessage(e => {
            switch (e.type) {
                case 'add':
                    this.addNewDrawio(document);
                    return;
                case 'delete':
                    this.deleteDrawio(document, e.id);
                    return;
            }
        });

        updateWebview();
    }
    deleteDrawio(document: vscode.TextDocument, id: any) {
        throw new Error('Method not implemented.');
    }
    addNewDrawio(document: vscode.TextDocument) {
        throw new Error('Method not implemented.');
    }



    
}