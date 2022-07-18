import * as vscode from "vscode";

export class AbacusSession implements vscode.AuthenticationSession {

    constructor(
        public readonly id: string,
        public readonly accessToken: string,
        public readonly refreshToken: string,
        public readonly expiryDate: Date,
        public readonly account: vscode.AuthenticationSessionAccountInformation,
        public readonly scopes: readonly string[]
    ){}
}