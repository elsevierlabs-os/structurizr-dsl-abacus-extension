import { AuthenticationSessionAccountInformation } from "vscode";

export class AbacusAccount implements AuthenticationSessionAccountInformation {

    constructor( public readonly id: string, public readonly label: string){}
    
}