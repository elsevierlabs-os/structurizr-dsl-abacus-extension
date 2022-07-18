// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { AbacusClient } from '../../AbacusClient';

export class StructurizrSoftwareSystemCompletionProvider implements vscode.CompletionItemProvider {

	private _softwareSystemName: string;
	private _containerName: string;
	private _componentName: string;

	public constructor() {
		this._softwareSystemName = vscode.workspace.getConfiguration('abacus').get<string>('c4SoftwareSystem', 'Software System');
		this._containerName = vscode.workspace.getConfiguration('abacus').get<string>('c4Container','Container');
		this._componentName = vscode.workspace.getConfiguration('abacus').get<string>('c4Component','Component');
	}
	
    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext)
            : vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {

		return Promise.resolve(this.getSuggestions(document, position, token));

    }
    
	private async getSuggestions(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.CompletionList>{

		const completionItems = new vscode.CompletionList();
		completionItems.isIncomplete = true;

        // get all text until the `position` and check if it reads `softwareSystem` or `container`
		// and if so then complete with one of a list of systems from abacus
		const linePrefix = document.lineAt(position).text.substr(0, position.character);
		console.log("<" + linePrefix + ">");
		var splitted = linePrefix.split(" ");
		console.log(splitted);
		var filterToken = splitted.pop() || '';
		var keyWord = splitted.pop();
		// We will get called for `softwareSystem xxx` where `xxx` is the typeahead where we need to expand around
		if (keyWord?.toLowerCase() === 'softwaresystem'){
			let results = await AbacusClient.getSystems(this._softwareSystemName, filterToken);
			completionItems.items = results;
		}
		// We will also expand the same way for `container xxx` where `xxx` is the typeahead where we need to expand around
		else if (keyWord?.toLowerCase() === 'container'){
			let results = await AbacusClient.getSystems(this._containerName, filterToken);
			completionItems.items = results;
		}
		// We will also expand the same way for `component xxx` where `xxx` is the typeahead where we need to expand around
		else if (keyWord?.toLowerCase() === 'component'){
			let results = await AbacusClient.getSystems(this._componentName, filterToken);
			completionItems.items = results;
		}

		return completionItems;
	}
}
