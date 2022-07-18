import * as vscode from 'vscode';
import {
    Workspace,
    Location,
    InteractionStyle,
    AutomaticLayout,
    CreateImpliedRelationshipsUnlessAnyRelationshipExistsStrategy,
} from 'structurizr-typescript';
import { AbacusClient } from './AbacusClient';

export class WorkspaceFactory {

    // See https://github.com/ChristianEder/structurizr-typescript/blob/master/sample/workspace.ts on how to build a model
    // See https://github.com/structurizr/dsl/blob/master/src/main/java/com/structurizr/dsl/StructurizrDslFormatter.java
    // on how to build a model to DSL formatter - odd there is no typescript one already
    async buildWorkspace(eeid: string): Promise<Workspace> {
        let workspace = new Workspace("Some workspace name", "Some workspace description");
        workspace.model.impliedRelationshipsStrategy = new CreateImpliedRelationshipsUnlessAnyRelationshipExistsStrategy();
        let workspaceComponentMap = new Map<number,any>();
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification, 
            title: "Building Structurizr Workspace", 
            cancellable: true
        }, async (progress, token) => {
            token.onCancellationRequested(() => { return workspace; });
            progress.report({message: "Creating workspace ...", increment: 0});
            var entity = await AbacusClient.getEntityDetails(eeid);
            if (entity !== undefined){
                const c4pp = vscode.workspace.getConfiguration('abacus').get<string>('c4Person', 'Person');
                const c4ss = vscode.workspace.getConfiguration('abacus').get<string>('c4SoftwareSystem','Software System');
                const c4ct = vscode.workspace.getConfiguration('abacus').get<string>('c4Container','Container');
                const c4cm = vscode.workspace.getConfiguration('abacus').get<string>('c4Component','Component');
                if (entity?.ComponentTypeName === c4ss){
                    progress.report({message: "Creating root Software System ...", increment: 10});
                    // STEP 1 ADD ENTITIES
                    // Add core Software System
                    const root = workspace.model.addSoftwareSystem(entity.Name, entity.Description);
                    if (root) { root.id = entity.EEID.toString(); }
                    workspaceComponentMap.set(entity.EEID, root);
                    // Add core Software System Containers
                    let childDS = await AbacusClient.getChildren(entity.EEID.toString(), c4ct, "", 0);
                    if (childDS) {
                        for (var item of childDS.value) {
                            let child = root?.addContainer(item.Name, item.Description,"");
                            if (child) { child.id = item.EEID.toString(); }
                            workspaceComponentMap.set(item.EEID, child);
                            // Add core Software System Components
                            let subChildDS = await AbacusClient.getChildren(item.EEID.toString(), c4cm, "", 0);
                            if (subChildDS){
                                for (var subitem of subChildDS.value){
                                    let subchild = child?.addComponent(subitem.Name, subitem.Description, "");
                                    if (subchild) { subchild.id = subitem.EEID.toString(); }
                                    workspaceComponentMap.set(subitem.EEID, subchild);
                                }
                            }
                        }
                    }
                    progress.report({message: "Creating connections list ...", increment: 20});
                    // STEP 2. BUILD CONNECTIONS LIST
                    let abacusConnectionMap = new Map<number,any>();
                    for (let [eeid, value] of workspaceComponentMap) {
                        let newConnections = await AbacusClient.getConnections(eeid.toString());
                        if (newConnections){
                            for (var conn of newConnections.value){
                                if (!abacusConnectionMap.has(conn.EEID)){
                                    abacusConnectionMap.set(conn.EEID, conn);
                                }
                            }
                        }
                    }
    
                    progress.report({message: "Adding related entities ...", increment: 40});
                    // STEP 3. ADD EXTERNAL ENTITIES
                    for (let [eeid, value] of abacusConnectionMap) {
                        let nodes:number[] = [value.SourceComponentEEID, value.SinkComponentEEID];
                        for (let node of nodes){
                            if (!workspaceComponentMap.has(node)) {
                                let newItem = await AbacusClient.getEntityDetails(node.toString());
                                if (newItem){
                                    switch (newItem.ComponentTypeName) {
                                        case c4ss:
                                            let ss= workspace.model.addSoftwareSystem(newItem.Name, newItem.Description);
                                            if (ss) { ss.id = newItem.EEID.toString(); }
                                            workspaceComponentMap.set(newItem.EEID, ss);
                                            break;
                                        case c4ct:
                                            // Get parent
                                            let parent = await AbacusClient.getEntityDetails(newItem.ParentEEID.toString());
                                            if (parent && !workspaceComponentMap.has(parent?.EEID)){
                                                let pt = workspace.model.addSoftwareSystem(parent.Name, parent.Description);
                                                if (pt) { pt.id = parent.EEID.toString(); }
                                                workspaceComponentMap.set(parent.EEID, pt);
                                            }
                                            if (parent){
                                                let modelParent = workspaceComponentMap.get(parent.EEID);
                                                let ct = workspace.model.addContainer(modelParent, newItem.Name, newItem.Description,"");
                                                if (ct) { ct.id = newItem.EEID.toString(); }
                                                workspaceComponentMap.set(newItem.EEID, ct);
                                            }
                                            break;
                                        case c4cm:
                                            // Get parent container
                                            let ctn = await AbacusClient.getEntityDetails(newItem.ParentEEID.toString());
                                            if (ctn) {
                                                // get parent softwareSystem
                                                let softs = await AbacusClient.getEntityDetails(ctn.ParentEEID.toString());
                                                if (softs) {
                                                    if (!workspaceComponentMap.has(softs.EEID)){
                                                        let wsofts = workspace.model.addSoftwareSystem(softs.Name, softs.Description);
                                                        if (wsofts) { wsofts.id = softs.EEID.toString(); }
                                                        workspaceComponentMap.set(softs.EEID, wsofts);
                                                        if (wsofts && !workspaceComponentMap.has(ctn.EEID)){
                                                            let wctn = workspace.model.addContainer(wsofts, ctn.Name, ctn.Description, "");
                                                            if (wctn) { wctn.id = ctn.EEID.toString(); }
                                                            workspaceComponentMap.set(ctn.EEID, wctn);
                                                            if (wctn) {
                                                                let wcm = workspace.model.addComponent(wctn, newItem.Name, newItem.Description);
                                                                if (wcm) { wcm.id = newItem.EEID.toString(); }
                                                                workspaceComponentMap.set(newItem.EEID, wcm);
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                            break;
                                        case c4pp:
                                            let peep = workspace.model.addPerson(newItem.Name, newItem.Description);
                                            if (peep) { peep.id = newItem.EEID.toString(); }
                                            workspaceComponentMap.set(newItem.EEID, peep);
                                            break;
                                        default:
                                            vscode.window.showErrorMessage("Encountered an entity that is not a Software System, Container, Component, Person or Relationship: " + newItem.Name + " of type " + newItem.ComponentTypeName);
                                            break;
                                    }
                                }
                            }
                        }
                    }
    
                    progress.report({message: "Adding relationships ...", increment: 60});
                    // STEP 4. ADD CONNECTIONS LIST
                    for (let [eeid, value] of abacusConnectionMap) {
                        let source = workspaceComponentMap.get(value.SourceComponentEEID);
                        let target = workspaceComponentMap.get(value.SinkComponentEEID);
                        if (source && target){
                            workspace.model.addRelationship(source, target, value.Name, "");
                        }
                    }
    
                    progress.report({message: "Adding views ...", increment: 80});
                    // STEP 5. ADD VIEWS
                    if (root) {
                        const systemcontextview = workspace.views.createSystemContextView(root, "SystemContext", root.description);
                        systemcontextview.automaticLayout = new AutomaticLayout();
                        systemcontextview.addAllElements();
                        systemcontextview.addNearestNeighbours(root);
                        const containerview = workspace.views.createContainerView(root, "Container", root.description);
                        containerview.automaticLayout = new AutomaticLayout();
                        containerview.addAllElements();
                        containerview.addNearestNeighbours(root);
                    }
    
                    progress.report({message: "Formatting final output ...", increment: 90});
                    workspace.views.configuration.theme = 'default';
                    progress.report({message: "All done ...", increment: 100});
                }
                else {
                    vscode.window.showErrorMessage("Attempted to build Structurizr DSL based on non Software System root");
                }
            }
        });
        return workspace;
    }
}