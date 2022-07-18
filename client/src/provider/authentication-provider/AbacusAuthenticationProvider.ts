import * as vscode from "vscode";
import { AbacusClient } from "../../AbacusClient";
import { AbacusSession } from "./AbacusSession";

export default class AbacusAuthenticationProvider implements vscode.AuthenticationProvider, vscode.Disposable {

    static id = 'abacus';
    private static secretKey = 'abacus';

    // this property is used to determine if the session has been changed in another window of VS Code.
	// It is used in the checkForUpdates function.
	private currentSession: AbacusSession | undefined;
    private initializedDisposable: vscode.Disposable | undefined; 

    private _onDidChangeSessions = new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();

	get onDidChangeSessions(): vscode.Event<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent> {
		return this._onDidChangeSessions.event;
	}

    constructor(private readonly secretStorage: vscode.SecretStorage) { }

    dispose() {
        this.initializedDisposable?.dispose();
    }

    private ensureInitialized() : void {
        if (this.initializedDisposable === undefined) {
            void this.loadSessionFromStorage();
            this.initializedDisposable = vscode.Disposable.from (
                // This onDidChange event happens when the secret storage changes in _any window_ since
                // secrets are shared across all open windows.
                this.secretStorage.onDidChange(e => {
                    if (e.key === AbacusAuthenticationProvider.secretKey) {
                        void this.checkForUpdates();
                    }
                }),
                // This fires when the user initiates a "silent" auth flow via the Accounts menu.
                vscode.authentication.onDidChangeSessions(e => {
                    if (e.provider.id === AbacusAuthenticationProvider.id) {
                        void this.checkForUpdates();
                    }
                }),
            );
        }
    }

    // This is a crucial function that handles whether or not the session has changed in
    // a different window of VS Code and sends the necessary event if it has.
    private async checkForUpdates() : Promise<void> {
        const added: AbacusSession[] = [];
        const removed: AbacusSession[] = [];
        const changed: AbacusSession[] = [];

        const previousSession = await this.currentSession;
        const session = (await this.getSessions())[0];

        if (session?.accessToken && !previousSession?.accessToken) {
            added.push(session);
        } else if (!session?.accessToken && previousSession?.accessToken) {
            removed.push(session);
        } else if (session?.accessToken !== previousSession?.accessToken){
            changed.push(session);
        } else {
            return;
        }

        void await this.loadSessionFromStorage();
        this._onDidChangeSessions.fire({ added: added, removed: removed, changed: changed });
    }

    private async loadSessionFromStorage() : Promise<AbacusSession | undefined> {
        let astring = await this.secretStorage.get(AbacusAuthenticationProvider.secretKey);
        if (astring) {
            this.currentSession = JSON.parse(astring) as AbacusSession;
            return this.currentSession;
        } else {
            return undefined;
        }
        
    }
    
    // This function is called first when `vscode.authentication.getSessions` is called.
    async getSessions(scopes?: readonly string[]): Promise<readonly AbacusSession[]> {
        this.ensureInitialized();
        const session = await this.loadSessionFromStorage();
        if (session) {
            if (this.isExpired(session)) {
                await this.secretStorage.delete(AbacusAuthenticationProvider.secretKey);
                return [];
            } else {
                if (this.isDueRefresh(session)) {
                    const renewedSession = await AbacusClient.refreshSession(session);
                    if (renewedSession) {
                        await this.secretStorage.store(AbacusAuthenticationProvider.secretKey, JSON.stringify(renewedSession));
                        console.log("Successfully renewed the Abacus token.");
                        return [renewedSession];
                    }
                } else {
                    return [session];
                }
            }
        } 
        return [];
    }

    isExpired(session: AbacusSession) : boolean {
        let now = new Date();
        let exp = new Date(session.expiryDate);
        let pastDue = now >= exp;
        return (pastDue);
    }

    // If less than 1 hour to expiry it is due for refresh
    isDueRefresh(session: AbacusSession) : boolean {
        let now = new Date();
        let exp = new Date(session.expiryDate);
        let timeToExpiry = (exp.getTime() - now.getTime()) / 1000 / 3600;
        if (timeToExpiry < 1){
            return true;
        } else {
            return false;
        }
    }
    
    // This function is called after `this.getSessions` is called and only when:
	// - `this.getSessions` returns nothing but `createIfNone` was set to `true` in `vscode.authentication.getSessions`
	// - `vscode.authentication.getSessions` was called with `forceNewSession: true`
	// - The end user initiates the "silent" auth flow via the Accounts menu
    async createSession(scopes: readonly string[]): Promise<AbacusSession> {
        this.ensureInitialized();

        const username = await vscode.window.showInputBox({
			title: "Abacus API Credentials",
			prompt: 'Enter your username'
		});
		if (username)
		{
			const password = await vscode.window.showInputBox({
				title: 'Abacus API Credentials',
				prompt: 'Enter your password',
				password: true
			});
			if (password)
			{
				const session = await AbacusClient.createSession(username, password);
                if (session) {
                    await this.secretStorage.store(AbacusAuthenticationProvider.secretKey, JSON.stringify(session));
                    console.log('Successfully logged into Abacus API');
                    return session;
                } else {
                    throw new Error('Unable to authenticate user.');
                }                
			}
		}
        throw new Error('Abacus API login process aborted.');
    }
    
    // This function is called when the end user signs out of the account.
    async removeSession(sessionId: string): Promise<void> {
        await this.secretStorage.delete(AbacusAuthenticationProvider.secretKey);
    }
}