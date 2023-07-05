// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { PassThrough } from 'stream';
import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import { AbacusClient } from './AbacusClient';
import AbacusAuthenticationProvider from './provider/authentication-provider/AbacusAuthenticationProvider';
import { StructurizrSoftwareSystemCompletionProvider } from './provider/completion-provider/StructurizrSoftwareSystemCompletionProvider';
import { AbacusComponentProvider, AbacusNode } from './provider/tree-data-provider/AbacusComponentProvider';
import { StructurizrClient } from './StructurizrClient';
import path = require('path');
import { DrawioEditorProvider } from './DrawioEditor';

let client: LanguageClient;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	// Get path to server
	let serverModule = context.asAbsolutePath(path.join('server','out','server.js'));
	// The debug options for the server
	let debugOptions = {execArgv: ['--nolazy', '--inspect=6009']};
	// If the extension is launched in debug mode then the debug server options are used
	// otherwise then run options are used
	let serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};
	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		documentSelector: [{scheme: 'file', language: 'structurizr'}],
		synchronize: {
			fileEvents: vscode.workspace.createFileSystemWatcher('**/.dsl')
		}
	};
	// Create the language client
	client = new LanguageClient(
		'structurizrLanguageServer',
		'Structurizr Language Server',
		serverOptions,
		clientOptions
	);
	// Start the client
	client.start();

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "structurizr-dsl-abacus-extension" is now active!');
	
	context.subscriptions.push(
		vscode.authentication.registerAuthenticationProvider(
			AbacusAuthenticationProvider.id, 'Abacus Enterprise', new AbacusAuthenticationProvider(context.secrets)
		)
	);
	
	context.subscriptions.push( 
		vscode.languages.registerCompletionItemProvider(
			'structurizr', new StructurizrSoftwareSystemCompletionProvider(), ' '
		) 
	);

	const treeDataProvider = new AbacusComponentProvider();
	
	context.subscriptions.push(
		vscode.window.registerTreeDataProvider(
			'abacusComponents',	treeDataProvider
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('abacus.createDSL', (node: AbacusNode) => treeDataProvider.createDSL(node) )
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('abacus.createDrawIO', (node: AbacusNode) => treeDataProvider.createDrawIO(node))
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('abacus.createPlantUML', (node: AbacusNode) => treeDataProvider.createPlantUML(node))
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('abacus.createC4PlantUML', (node: AbacusNode) => treeDataProvider.createC4PlantUML(node))
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('abacus.login', async () => {
			const session = await vscode.authentication.getSession(AbacusAuthenticationProvider.id, [], {createIfNone: true});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('structurizr.publish', async () => {
			await StructurizrClient.publishDSL();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('structurizr.diagrams', async (uri: vscode.Uri) => {
			await StructurizrClient.fetchDiagrams(uri);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('drawio.diagrams', async () => {
			// Here we need to call the drawio compiler to generate the drawio files.
			// Likely a version of the DrawIOFormatter
			vscode.window.showWarningMessage('This capability is coming soon.');
		})
	);

	context.subscriptions.push(DrawioEditorProvider.register(context));

	showWelcomeMessage(context);

	establishAbacusCache(context);
}

// this method is called when your extension is deactivated
export function deactivate() { 
	saveAbacusCache();
	if (client) {
		client.stop();
	}
	console.log('Your extension "structurizr-dsl-abacus-extension" has been killed.');
}

function showWelcomeMessage(context: vscode.ExtensionContext) {
	let previousVersion = context.globalState.get<string>('abacus-structurizr-dsl-extension');
	let currentVersion = vscode.extensions.getExtension('Elsevier.abacus-structurizr-dsl-extension')?.packageJSON?.version;
	let message : string | null = null;
	let previousVersionArray = previousVersion ? previousVersion.split('.').map((s: string) => Number(s)) : [0, 0, 0];
	let currentVersionArray = currentVersion.split('.').map((s: string) => Number(s));
	if (previousVersion === undefined || previousVersion.length === 0) {
		message = "Thanks for using Abacus Structurizr DSL Extension.";
	} else if (currentVersion !== previousVersion && (
		// (previousVersionArray[0] === currentVersionArray[0] && previousVersionArray[1] === currentVersionArray[1] && previousVersionArray[2] < currentVersionArray[2]) ||
		(previousVersionArray[0] === currentVersionArray[0] && previousVersionArray[1] < currentVersionArray[1]) ||
		(previousVersionArray[0] < currentVersionArray[0])
	)
	) {
		message = "Abacus Structurizr DSL Extension updated to " + currentVersion;
	}
	if (message) {
		vscode.window.showInformationMessage(message, '⭐️ Rate', '⭐️ Star on Github', '🪲 Report Bug')
			.then(function (val: string | undefined) {
				if (val === '⭐️ Rate') {
					vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=Elsevier.structurizr-dsl-abacus-extension'));
				} else if (val === '🪲 Report Bug') {
					vscode.env.openExternal(vscode.Uri.parse('https://github.com/elsevierlabs-os/structurizr-dsl-abacus-extension/issues'));
				} else if (val === '⭐️ Star on Github') {
					vscode.env.openExternal(vscode.Uri.parse('https://github.com/elsevierlabs-os/structurizr-dsl-abacus-extension'));
				}
			});
		context.globalState.update('abacus-structurizr-dsl-extension', currentVersion);
	}
}

function establishAbacusCache(context: vscode.ExtensionContext){
	// Make sure the AbacusClient has a working cache.
	// This should be part of AbacusClient constructor but it has no 
	// access to the context... 
	console.log('Establish Abacus Cache being called.');
	AbacusClient.initCache(context);
}

async function saveAbacusCache(){
	await AbacusClient.saveCache();
}
