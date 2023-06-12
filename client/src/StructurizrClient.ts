import { posix } from 'path';
import * as puppeteer from 'puppeteer';
import * as vscode from 'vscode';
import { FsConsumer } from './FsConsumer';

export class StructurizrClient {

	static async publishDSL() {
        const targetFolder = vscode.workspace.getConfiguration('structurizrLite').get<string>('workspaceLocation', "").trim();
        if (targetFolder.length < 1) {
            vscode.window.showErrorMessage("There is no configured Structurizr Lite workspace folder.");
        } else {
		    const editor = vscode.window.activeTextEditor;

            if (editor) {
                const document = editor.document;
                const folderUri = vscode.Uri.file(targetFolder);
                const fileUri = folderUri.with({ path: posix.join(folderUri.path, "workspace.dsl") });
                const writeData = Buffer.from(document.getText(), 'utf8');
                await vscode.workspace.fs.writeFile(fileUri, writeData);
                vscode.window.showInformationMessage("DSL workspace file sent to Structurizr.");
            } else {
                vscode.window.showErrorMessage("Unable to obtain DSL content from currently active editor.");
            }
        }
	}

    static async fetchDiagrams(file: vscode.Uri) {
        
        const filename = posix.basename(file.path,'.dsl');
        var actualNumberOfExports = 0;
        var expectedNumberOfExports = 0;
        var diagramKeys: any[] = [];
        var filenameSuffix = 'structurizr-';
        if (filename.length > 0){
            filenameSuffix = filename + '-';
        }
        

        const liteServer = vscode.workspace.getConfiguration('structurizrLite').get<string>('server', "").trim();
        if (liteServer.length < 10 || !liteServer.toLocaleLowerCase().startsWith('http')) {
            vscode.window.showErrorMessage("There is no configured Structurizr Lite server.");
        }
        try {
            const browser = await puppeteer.launch({headless: true});
            const page = await browser.newPage();
            await page.setViewport({ width: 1024, height: 800, deviceScaleFactor: 1});
            const diagramURL = posix.join(liteServer, "workspace/diagrams");
            await page.goto(diagramURL, { waitUntil: 'domcontentloaded' });
            await page.waitForFunction('structurizr.scripting && structurizr.scripting.isDiagramRendered() === true');
            // Figure out which views should be exported
            const views = await page.evaluate('structurizr.scripting.getViews()');
            views.forEach((view: { key: any; }) => {
                var x = view.key;
                diagramKeys.push(x);
            });
            // Every diagram has a key/legend
            let fsclient = new FsConsumer();
            for (var i=0; i < diagramKeys.length; i++){
                var diagramKey = diagramKeys[i];
                await page.evaluate(`structurizr.scripting.changeView('${diagramKey}')`);
                await page.waitForFunction('structurizr.scripting.isDiagramRendered() === true');
                // diagram
                const diagramFilename = filenameSuffix + diagramKey + '.png';
                var imageraw = await page.evaluate('structurizr.scripting.exportCurrentDiagramToPNG({crop: false})');
                await fsclient.createImageFile(diagramFilename, imageraw);
                // key
                const diagramKeyFilename = filenameSuffix + diagramKey + '-key.png';
                var imageraw = await page.evaluate('structurizr.scripting.exportCurrentDiagramKeyToPNG()');
                await fsclient.createImageFile(diagramKeyFilename, imageraw);
            }
            browser.close();
        } catch {
            vscode.window.showErrorMessage("Unable to connect to Structurizr Lite server. Please check config and ensure it is running.");
        }
    }
}