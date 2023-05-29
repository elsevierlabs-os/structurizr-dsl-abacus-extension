import { Component, ComponentView, Container, ContainerView, DeploymentView, Element, Person, Relationship, RelationshipView, SoftwareSystem, StaticStructureElement, StaticView, SystemContextView, View, Workspace } from "structurizr-typescript";
import { C4Views } from "./C4Views";
import { StringWriter } from "./StringWriter";

export class DrawIOFormatter {
    public formatWorkspace(workspace: Workspace) : C4Views {
        let response = new C4Views();
        let contextResult = new StringWriter();
        let containerResult = new StringWriter();
        let componentResult = new StringWriter();
        let deploymentResult = new StringWriter();

        if (workspace) {
            workspace.views.systemContextViews.forEach(v => {
                this.writeSystemContextView(v, contextResult);
            });
            workspace.views.containerViews.forEach(v => {
                this.writeContainerView(v, containerResult);
            });
            workspace.views.componentViews.forEach(v => {
                this.writeComponentView(v, componentResult);
            });
            workspace.views.deploymentViews.forEach(v => {
                this.writeDeploymentView(v, deploymentResult);
            });
        }

        response.context = contextResult.toString();
        response.container = containerResult.toString();
        response.component = componentResult.toString();
        response.deployment = deploymentResult.toString();
        
        return response;
    }
    writeDeploymentView(v: DeploymentView, deploymentResult: StringWriter) {
        throw new Error("Method not implemented.");
    }
    writeComponentView(v: ComponentView, componentResult: StringWriter) {
        throw new Error("Method not implemented.");
    }
    writeContainerView(v: ContainerView, containerResult: StringWriter) {
        throw new Error("Method not implemented.");
    }
    writeSystemContextView(v: SystemContextView, contextResult: StringWriter) {
        throw new Error("Method not implemented.");
    }
}