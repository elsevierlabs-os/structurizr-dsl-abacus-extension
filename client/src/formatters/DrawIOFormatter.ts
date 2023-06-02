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
            for (const view of workspace.views.containerViews) {
                response.container = await this.writeContainerView(view);
            }
            for (const view of workspace.views.componentViews) {
                response.component = await this.writeComponentView(view);
            }
            for (const view of workspace.views.deploymentViews) {
                response.deployment = await this.writeDeploymentView(view);
            }
        }
        
        return response;
    }

    async writeSystemContextView(v: SystemContextView) : Promise<string> {
        console.log('*** DRAWIO System Context View Builder ***');
        var mx = new MxBuilder();

        // This is not needed as we build from the model and view parameters. 
        //this.writeElement(v.softwareSystem, mx);

        // Here we need to get a list of elements to include if not the entire model (no entries == whole model)
        let elementList : string[];
        v.elements
        .map(e => e.element)
        .sort(this.by(e => e.name))
        .forEach(e => elementList.push(e.id));

        // Now we need to navigate the model and pull out all the SoftwareSystems as this is a context diagram
        // If v.elements is not empty we need to compare notes. This can be greatly improved.
        if (v.elements.length === 0){
            v.softwareSystem.model.softwareSystems.sort(this.by(s => s.name)).forEach(s => this.writeElement(s,mx));
        } else {
            v.softwareSystem.model.softwareSystems.sort(this.by(s => s.name)).forEach(s=> { if (elementList.includes(s.id)) {this.writeElement(s,mx);}});
        }

        // Here we need to get a list of relationships to include if not everything in the entire model (no entries == whole model)
        if (v.relationships.length > 0) {
            this.writeRelationships(v.relationships, mx);
        } else {
            v.softwareSystem.model.relationships.forEach(r => {
                console.log(`Relationship between <${r.source.type}> ${r.source.name} and <${r.destination.type}> ${r.destination.name}`);
                // It is possible we are spoon fed all relationship hierarchies and just need to cherry pick the SS to SS ones
                if (r.source.id !== r.destination.id && r.source.type === SoftwareSystem.type && r.destination.type === SoftwareSystem.type) {
                    this.writeRelationship(r, mx);
                }
            });
        }

        const dwg = await mx.toDiagram();
        return dwg;
    }

    async writeContainerView(v: ContainerView) : Promise<string> {
        console.log('*** DRAWIO System Container View Builder ***');
        var mx = new MxBuilder();

        // Here we need to get a list of elements to include if not the entire model (no entries == whole model)
        let elementList : string[];
        v.elements
        .map(e => e.element)
        .sort(this.by(e => e.name))
        .forEach(e => elementList.push(e.id));

        // Now we need to navigate the model and pull out all the SoftwareSystems as this is a container diagram
        // Only the target SoftwareSystem will have containers elaborated
        // If v.elements is not empty we need to compare notes. This can be greatly improved.
        if (v.elements.length === 0){
            v.softwareSystem.model.softwareSystems.sort(this.by(s => s.name)).forEach(s => {
                if (s.id === v.softwareSystem.id)
                {
                    this.writeElementBoundary(s,mx);
                    // We need to drop the containers here
                    s.containers.sort(this.by(c => c.name)).forEach(c => {
                        this.writeElement(c, mx);
                    });
                }
                else
                {
                    this.writeElement(s,mx);
                }
            });
        } else {
            v.softwareSystem.model.softwareSystems.sort(this.by(s => s.name)).forEach(s=> {
                if (elementList.includes(s.id)) {
                    if (s.id === v.softwareSystem.id)
                    {
                        this.writeElementBoundary(s,mx);
                    }
                    else
                    {
                        this.writeElement(s,mx);
                    }
                }
            });
        }

        const dwg = await mx.toDiagram();
        return dwg;
    }

    async writeComponentView(v: ComponentView) : Promise<string> {
        console.log('*** DRAWIO Component View Builder ***');
        var mx = new MxBuilder();

        const dwg = await mx.toDiagram();
        return dwg;
    }

    async writeDeploymentView(v: DeploymentView) : Promise<string> {
        console.log('*** DRAWIO Deployment View Builder ***');
        var mx = new MxBuilder();

        const dwg = await mx.toDiagram();
        return dwg;
    }

    writeElement(e: Element, mx: MxBuilder): void {
        switch (e.type){
            case Person.type:
                mx.placePerson(e.name, e.description, e.id);
                break;
            case SoftwareSystem.type:
                mx.placeSoftwareSystem(e.name, e.description, e.id);
                break;
            case Container.type:
                mx.placeContainer(e.name, 'Tech goes here', e.description, e.id, e.parent.id);
                break;
            case Component.type:
                mx.placeComponent(e.name, 'Tech goes here', e.description, e.id, e.parent.id);
                break;
            default:
                break;
        }
    }

    writeElementBoundary(e: Element, mx: MxBuilder): void {
        switch (e.type){
            case SoftwareSystem.type:
                mx.placeSystemScopeBoundary(e.name, e.description, e.id);
                break;
            case Container.type:
                mx.placeContainerScopeBoundary(e.name, e.description, e.id, e.parent.id);
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

    getParentOfType(entity: Element, type: string) {
        switch (entity.type) {
            case Person.type:
                return entity.id;
                break;
            case SoftwareSystem.type:
                return entity.id;
                break;
            case Container.type:
                return entity.parent.id;
                break;
            case Component.type:
                return entity.parent.parent.id;
                break;
        }

        return '';
    }

    private by<TItem, TProperty>(value: (i: TItem) => TProperty): (a: TItem, b: TItem) => number {
        return (a, b) => {
            var va = value(a);
            var vb = value(b);
            return va > vb ? 1 : va < vb ? -1 : 0;
        };
    }
}


