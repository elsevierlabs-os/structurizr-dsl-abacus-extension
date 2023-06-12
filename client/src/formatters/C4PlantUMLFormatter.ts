import { Component, ComponentView, Container, ContainerView, DeploymentView, Element, Person, Relationship, RelationshipView, SoftwareSystem, StaticStructureElement, StaticView, SystemContextView, View, Workspace } from "structurizr-typescript";
import { C4Views } from "./C4Views";
import { StringWriter } from "./StringWriter";

// This class was to extend the structurizr-typescript class plantUMLWriter but first pass 
// I am writing it in parallel for clarity.
export class C4PlantUMLFormatter {
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

    private writeSystemContextView(v: SystemContextView, writer: StringWriter) {
        this.writeHeader(v, writer);

        v.elements
            .map(e => e.element)
            .sort(this.by(e => e.name))
            .forEach(e => this.writeElement(e, writer, false));

        this.writeRelationships(v.relationships, writer);
        
        this.writeFooter(writer);
    }

    private writeContainerView(v: ContainerView, writer: StringWriter) {
        this.writeStaticView(v, Container.type, v.softwareSystem!, writer);
    }

    private writeComponentView(v: ComponentView, writer: StringWriter) {
        this.writeStaticView(v, Component.type, v.container!, writer);
    }

    private writeDeploymentView(v: DeploymentView, result: StringWriter) {
        
    }

    private writeStaticView(v: StaticView, type: string, element: StaticStructureElement, writer: StringWriter) {
        this.writeHeader(v, writer);

        v.elements
            .map(e => e.element)
            .filter(e => e.type !== type)
            .sort(this.by(e => e.name))
            .forEach(e => this.writeElement(e, writer, false));

        if (type === Container.type){
            writer.writeLine(`System_Boundary(${element.id}, "${element.name}") {`);
        } else if (type === Component.type) {
            writer.writeLine(`Container_Boundary(${element.id}, "${element.name}") {`);
        } else {
            writer.writeLine(`Boundary(${element.id}, "${element.name}") {`);
        }

        v.elements
            .map(e => e.element)
            .filter(e => e.type === type)
            .sort(this.by(e => e.name))
            .forEach(e => this.writeElement(e, writer, true));

        writer.writeLine("}");
        
        this.writeRelationships(v.relationships, writer);

        this.writeFooter(writer);
    }

    private writeElement(e: Element, writer: StringWriter, indent: boolean) {
        if (indent){
            writer.write("    ");
        }
        switch(e.type){
            case Person.type:
                writer.writeLine(`Person(${e.id}, "${e.name}", "${e.description}")`);
                break;
            case SoftwareSystem.type:
                writer.writeLine(`System(${e.id}, "${e.name}", "${e.description}")`);
                break;
            case Container.type:
                writer.writeLine(`Container(${e.id}, "${e.name}", "${e.description}")`);
                break;
            case Component.type:
                writer.writeLine(`Component(${e.id}, "${e.name}", "${e.description}")`);
                break;
            default:
                writer.writeLine("");
                break;
        }
    }

    private writeRelationships(relationships: RelationshipView[], writer: StringWriter) {
        relationships.map(r => r.relationship)
            .sort(this.by(r => r.source.name + r.destination.name))
            .forEach(r => this.writeRelationship(r, writer));
    }

    private writeRelationship(r: Relationship, writer: StringWriter) {
        writer.writeLine(`Rel(${r.source.id}, ${r.destination.id}, "${r.description}", "${r.technology}")`);
    }

    private by<TItem, TProperty>(value: (i: TItem) => TProperty): (a: TItem, b: TItem) => number {
        return (a, b) => {
            var va = value(a);
            var vb = value(b);
            return va > vb ? 1 : va < vb ? -1 : 0;
        };
    }

    private writeHeader(v: View, writer: StringWriter) {
        writer.writeLine("@startuml");
        if (v instanceof SystemContextView) {
            writer.writeLine("!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml");
        } else if (v instanceof ContainerView) {
            writer.writeLine("!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml");
        } else if (v instanceof ComponentView) {
            writer.writeLine("!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml");
        } else if (v instanceof DeploymentView) {
            writer.writeLine("!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Deployment.puml");
        } else {
            writer.writeLine("!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml");
        }
        writer.newline();
        writer.writeLine("LAYOUT_WITH_LEGEND()");
        writer.newline();
        writer.writeLine("title " + v.name);
        writer.newline();
        if (v.description) {
            writer.writeLine("caption " + v.description);
            writer.newline();
        }
    }

    private writeFooter(writer: StringWriter) {
        writer.writeLine("@enduml");
        writer.newline();
        writer.newline();
    }
}