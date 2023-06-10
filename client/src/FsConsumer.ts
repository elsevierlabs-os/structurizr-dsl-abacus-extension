import * as vscode from 'vscode';
import { posix } from 'path';


export class FsConsumer {

    public async createFile(filename: string, content: string){

        if (!vscode.workspace.workspaceFolders) {
			return vscode.window.showInformationMessage('No folder or workspace opened');
		}

        const writeData = Buffer.from(content, 'utf8');

        const folderUri = vscode.workspace.workspaceFolders[0].uri;
		const fileUri = folderUri.with({ path: posix.join(folderUri.path, filename) });

        await vscode.workspace.fs.writeFile(fileUri, writeData);

        await vscode.commands.executeCommand("vscode.open", fileUri);
    }

    public async createImageFile(filename: string, content: string) {
        if (!vscode.workspace.workspaceFolders) {
			return vscode.window.showInformationMessage('No folder or workspace opened');
		}
        
        content = content.replace(/^data:image\/png;base64,/,"");

        const writeData = Buffer.from(content, 'base64');

        const folderUri = vscode.workspace.workspaceFolders[0].uri;
		const fileUri = folderUri.with({ path: posix.join(folderUri.path, filename) });

        await vscode.workspace.fs.writeFile(fileUri, writeData);
        
        // There is a custom image preview editor in VS Code but it does not seem to be programmatically invokable
        // This works if default editor/previewer configured but does not stay open, only last file shown
        await vscode.commands.executeCommand("vscode.open", fileUri);
    }
}