import { Component, ComponentView, Container, ContainerView, DeploymentView, Element, Person, Relationship, RelationshipView, SoftwareSystem, StaticStructureElement, StaticView, SystemContextView, View, Workspace } from "structurizr-typescript";
import { C4Views } from "./C4Views";
import { StringWriter } from "./StringWriter";
import { MxBuilder } from "mxbuilder";


// This class takes a Structurizr workspace and converts it into a set of DrawIO files corresponding to the view defined in the workspace

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

    async writeSystemContextView(v: SystemContextView, contextResult: StringWriter) {
        console.log('*** DRAWIO System Context Builder ***');
        var mx = new MxBuilder();
        this.writeElement(v.softwareSystem, mx);

        v.elements
        .map(e => e.element)
        .sort(this.by(e => e.name))
        .forEach(e => this.writeElement(e, mx));

        this.writeRelationships(v.relationships, mx);
        contextResult.write(await mx.toDiagram());
    }

    writeContainerView(v: ContainerView, containerResult: StringWriter) {
        throw new Error("Method not implemented.");
    }

    writeComponentView(v: ComponentView, componentResult: StringWriter) {
        throw new Error("Method not implemented.");
    }

    writeDeploymentView(v: DeploymentView, deploymentResult: StringWriter) {
        throw new Error("Method not implemented.");
    }

    writeElement(e: Element, mx: MxBuilder): void {
        switch(e.type){
            case Person.type:
                mx.placePerson(e.name, e.description, e.id);
                break;
            case SoftwareSystem.type:
                mx.placeSoftwareSystem(e.name, e.description, e.id);
                break;
            case Container.type:
                mx.placeContainer(e.name, 'Tech goes here', e.description, e.id);
                break;
            case Component.type:
                mx.placeComponent(e.name, 'Tech goes here', e.description, e.id);
                break;
            default:
                break;
        }
    }

    writeRelationships(relationships: RelationshipView[], mx: MxBuilder) {
        relationships.map(r => r.relationship)
        .sort(this.by(r => r.source.name + r.destination.name))
        .forEach(r => this.writeRelationship(r, mx));
    }

    writeRelationship(r: Relationship, mx: MxBuilder): void {
        mx.placeRelationship(r.description, r.technology, r.source.id, r.destination.id);
    }

    private by<TItem, TProperty>(value: (i: TItem) => TProperty): (a: TItem, b: TItem) => number {
        return (a, b) => {
            var va = value(a);
            var vb = value(b);
            return va > vb ? 1 : va < vb ? -1 : 0;
        };
    }
}