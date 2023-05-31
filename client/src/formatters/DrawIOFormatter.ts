import { Component, ComponentView, Container, ContainerView, DeploymentView, Element, Person, Relationship, RelationshipView, SoftwareSystem, StaticStructureElement, StaticView, SystemContextView, View, Workspace } from "structurizr-typescript";
import { C4Views } from "./C4Views";
import { StringWriter } from "./StringWriter";
import { MxBuilder } from "mxbuilder";


// This class takes a Structurizr workspace and converts it into a set of DrawIO files corresponding to the view defined in the workspace

export class DrawIOFormatter {

    public async formatWorkspace(workspace: Workspace) : Promise<C4Views> {
        let response = new C4Views();

        if (workspace) {
            for (const view of workspace.views.systemContextViews) {
                response.context = await this.writeSystemContextView(view);
            }
            // workspace.views.systemContextViews.forEach(async v => {
            //     response.context = await this.writeSystemContextView(v);
            // });
            // workspace.views.containerViews.forEach(v => {
            //     response.container = this.writeContainerView(v);
            // });
            // workspace.views.componentViews.forEach(v => {
            //     response.component = this.writeComponentView(v);
            // });
            // workspace.views.deploymentViews.forEach(v => {
            //     response.deployment = this.writeDeploymentView(v);
            // });
        }
        
        return response;
    }

    async writeSystemContextView(v: SystemContextView) : Promise<string> {
        console.log('*** DRAWIO System Context View Builder ***');
        var mx = new MxBuilder();
        this.writeElement(v.softwareSystem, mx);

        v.elements
        .map(e => e.element)
        .sort(this.by(e => e.name))
        .forEach(e => this.writeElement(e, mx));

        this.writeRelationships(v.relationships, mx);
        const dwg = await mx.toDiagram();
        console.log('*** Context View is: ');
        console.log(dwg);
        return dwg;
    }

    writeContainerView(v: ContainerView) {
        console.log('*** DRAWIO System Container View Builder ***');
        return '';
    }

    writeComponentView(v: ComponentView) {
        console.log('*** DRAWIO Component View Builder ***');
        return '';
    }

    writeDeploymentView(v: DeploymentView) {
        console.log('*** DRAWIO Deployment View Builder ***');
        return '';
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