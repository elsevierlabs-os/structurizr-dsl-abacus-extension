import path = require('path');
import { PlantUMLWriter } from 'structurizr-typescript';
import * as vscode from 'vscode';
import { AbacusClient } from '../../AbacusClient';
import { FsConsumer } from '../../fsConsumer';
import { StructurizrDslFormatter } from '../../formatters/StructurizrDslFormatter';
import { WorkspaceFactory } from '../../WorkspaceFactory';
import { C4PlantUMLFormatter } from '../../formatters/C4PlantUMLFormatter';

export class AbacusComponentProvider implements vscode.TreeDataProvider<AbacusNode> {

    // Pass in context or something if required, for now we need nothing about the workspace
    constructor(){}

    getTreeItem(element: AbacusNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    async getChildren(element?: AbacusNode): Promise<AbacusNode[]> {

        let items: AbacusNode[] = [];
        let componentTypeName = '';
        let childC4Level = '';
        let page = 0;
        let itemCount = 0;

        // Section if there is a parent element
        if (element) {
            switch (element.c4level){
                case 'c4SoftwareSystem':
                    componentTypeName = vscode.workspace.getConfiguration('abacus').get<string>('c4Container','Container');
                    childC4Level = 'c4Container';
                    break;
                case 'c4Container':
                    componentTypeName = vscode.workspace.getConfiguration('abacus').get<string>('c4Component','Component');
                    childC4Level = 'c4Component';
                    break;
            }
            do {
                let childDS = await AbacusClient.getChildren(element.eeid, componentTypeName, "", 0);
                if (childDS) {
                    itemCount = childDS.value.length;
                    for (var item of childDS.value) {
                        let newItem = new AbacusNode(item.Name, item.EEID.toString(), childC4Level, vscode.TreeItemCollapsibleState.Collapsed);
                        newItem.tooltip = item.Description;
                        items.push(newItem);
                    }
                    page++;
                }
                else {
                    itemCount = 0;
                }
            } while (itemCount === 20);
            return Promise.resolve(items);
        }

        // Section if there is no parent element so this is the root
        componentTypeName = vscode.workspace.getConfiguration('abacus').get<string>('c4SoftwareSystem', 'Software System');
        do {
            let abacusDS = await AbacusClient.getSystemsDataset(componentTypeName, "", page);
            if (abacusDS) {
                itemCount = abacusDS.value.length;
                for (var item of abacusDS.value) {
                    let newItem = new AbacusNode(item.Name, item.EEID.toString(), 'c4SoftwareSystem', vscode.TreeItemCollapsibleState.Collapsed);
                    newItem.tooltip = item.Description;
                    items.push(newItem);
                }
                page++;
            }
            else {
                itemCount = 0;
            }
        } while (itemCount === 20);
        return Promise.resolve(items);
    }

    async createDSL(node: AbacusNode) {
        console.log(`createDSL called with the following node:`);
        console.log(node);
        let workspacefactory = new WorkspaceFactory();
        let workspace = await workspacefactory.buildWorkspace(node.eeid);
        let formatter = new StructurizrDslFormatter();
        const dslString = await formatter.formatWorkspace(workspace);
        let fsclient = new FsConsumer();
        await fsclient.createFile(node.label + ".dsl", dslString);
    }

    async createPlantUML(node: AbacusNode) {
		console.log(`createPlantUML called with the following node:`);
        console.log(node);
        let workspacefactory = new WorkspaceFactory();
        let workspace = await workspacefactory.buildWorkspace(node.eeid);
        const plantUML = new PlantUMLWriter().toPlantUML(workspace);
        let fsclient = new FsConsumer();
        await fsclient.createFile(node.label + ".puml", plantUML);
	}

    async createC4PlantUML(node: AbacusNode) {
        console.log(`createC4PlantUML called with the following node:`);
        console.log(node);
        let workspacefactory = new WorkspaceFactory();
        let workspace = await workspacefactory.buildWorkspace(node.eeid);
        const c4plantUML = new C4PlantUMLFormatter().formatWorkspace(workspace);
        let fsclient = new FsConsumer();
        if (c4plantUML.context.length > 0)
        {
            await fsclient.createFile(node.label + "-Context.puml", c4plantUML.context);
        }
        if (c4plantUML.container.length > 0)
        {
            await fsclient.createFile(node.label + "-Container.puml", c4plantUML.container);
        }
        if (c4plantUML.component.length > 0)
        {
            await fsclient.createFile(node.label + "-Component.puml", c4plantUML.component);
        }
        if (c4plantUML.deployment.length > 0)
        {
            await fsclient.createFile(node.label + "-Deployment.puml", c4plantUML.deployment);
        }
    }
}

export class AbacusNode extends vscode.TreeItem {

    constructor(
        public readonly label: string,
        public eeid: string,
        public c4level: string,
        public readonly collabsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collabsibleState);
        // this.tooltip = `${this.label} - ${this.eeid}`;
        this.description = this.eeid;
        this.contextValue = c4level;
        
        switch(c4level){
            case 'c4SoftwareSystem':
                this.iconPath = {
                    light: path.join(__filename, '..', '..', '..', '..', '..', 'resources', 'c4', 'light', 'softwaresystem.svg'),
                    dark: path.join(__filename, '..', '..', '..', '..', '..', 'resources', 'c4', 'dark', 'softwaresystem.svg')
                };
                break;
            case 'c4Container':
                this.iconPath = {
                    light: path.join(__filename, '..', '..', '..', '..', '..', 'resources', 'c4', 'light', 'container.svg'),
                    dark: path.join(__filename, '..', '..', '..', '..', '..', 'resources', 'c4', 'dark', 'container.svg')
                };
                break;
            case 'c4Component':
                this.iconPath = {
                    light: path.join(__filename, '..', '..', '..', '..', '..', 'resources', 'c4', 'light', 'component.svg'),
                    dark: path.join(__filename, '..', '..', '..', '..', '..', 'resources', 'c4', 'dark', 'component.svg')
                };
                break;
        }
    }
}