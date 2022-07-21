import { type } from "os";
import { format } from "path";
import { AutomaticLayout, Component, Container, ContainerInstance, CreateImpliedRelationshipsUnlessAnyRelationshipExistsStrategy, DeploymentElement, DeploymentNode, Element, ElementStyle, Location, ModelItem, Person, RankDirection, Relationship, RelationshipStyle, SoftwareSystem, Workspace } from "structurizr-typescript";
import { DslContext } from "./DslContext";
import { StructurizrDslTokens } from "./StructurizrDslTokens";

// Please see https://github.com/structurizr/dsl/blob/master/src/main/java/com/structurizr/dsl/StructurizrDslFormatter.java

export class StructurizrDslFormatter extends StructurizrDslTokens {

    indent:number = 0;
    buf:string = '';
    
    public async formatWorkspace(workspace:Workspace) : Promise<string> {
        
        this.start(this.WORKSPACE_TOKEN, this.quote(workspace.name), this.quote(workspace.description));
        this.newline();

        this.formatTokens(false, new Array(this.IMPLIED_RELATIONSHIPS_TOKEN, this.quote("false")));
        // this.formatTokens(false, new Array(this.IDENTIFIERS_TOKEN, this.quote("hierarchical")));
        this.newline();

        // MODEL SECTION

        this.start(this.MODEL_TOKEN);

        let internalPeople = workspace.model.people.filter((loc) => loc.location === Location.Internal);
        let internalSoftwareSystem = workspace.model.softwareSystems.filter((ss) => ss.location === Location.Internal);

        if (internalPeople.length > 0 || internalSoftwareSystem.length > 0){
            internalPeople.forEach((person) => { this.formatPerson(person); });
            internalSoftwareSystem.forEach((system) => { this.formatSoftwareSystem(system); });
            this.end();
        }

        let people = workspace.model.people.filter((loc) => loc.location !== Location.Internal);
        let softwareSystems = workspace.model.softwareSystems.filter((loc) => loc.location !== Location.Internal);

        people.forEach((person) => { this.formatPerson(person); });
        softwareSystems.forEach((system) => { this.formatSoftwareSystem(system); });

        workspace.model.relationships.forEach((rel) => {
            if (rel.source instanceof DeploymentElement || rel.destination instanceof DeploymentElement){
                // deployment element relationships are formatted below, after the deployment nodes have been formatted
            } else {
                this.start(this.id(rel.source, false), this.RELATIONSHIP_TOKEN, this.id(rel.destination, false), this.quote(rel.description), this.quote(rel.technology), this.quote(this.tagsRelationship(rel)));
                this.formatModelItem(rel);
                this.end();
            }
        });

        if (workspace.model.deploymentNodes.length > 0) {
            this.newline();
            workspace.model.deploymentNodes.forEach((node) => { 
                this.start(this.idModelItem(node), this.ASSIGNMENT_OPERATOR_TOKEN, this.DEPLOYMENT_ENVIRONMENT_TOKEN, this.quote(node.name));
                let x = workspace.model.deploymentNodes.filter(n => n.parent === null && n.environment === node.environment);
                x.forEach((i) => { this.formatDeploymentNode(i); });
                this.end();
            });
            this.newline();

            workspace.model.relationships.forEach((rel) => {
                if (!rel.linkedRelationshipId) {
                    if (rel.source instanceof DeploymentElement || rel.destination instanceof DeploymentElement) {
                        this.start(this.id(rel.source, false), this.RELATIONSHIP_TOKEN, this.id(rel.destination, false), this.quote(rel.description), this.quote(rel.technology), this.quote(this.tagsRelationship(rel)));
                        this.formatModelItem(rel);
                        this.end();
                    } else {
                        // static structire element only relationships are formatted here
                    }
                } else {
                    // do nothing - linked relationships are created automatically
                }
            });   
        }

        // End Models Section
        this.end();

        // VIEWS SECTION

        this.start(this.VIEWS_TOKEN);
        // Landscape views not supported yet
        workspace.views.systemContextViews.forEach((view) => {
            if (view.softwareSystem) {
                this.start(this.SYSTEM_CONTEXT_VIEW_TOKEN, this.idModelItem(view.softwareSystem), this.quote(view.key), this.quote(view.description));
                view.elements.forEach((elementview) => {
                    this.formatTokens(false, new Array(this.INCLUDE_IN_VIEW_TOKEN, this.id(elementview.element, true)));
                });
                if (view.elements.length < 1) {
                    this.formatTokens(false, new Array(this.INCLUDE_IN_VIEW_TOKEN, '*'));
                }
                this.formatAutomaticLayout(view.automaticLayout);
                this.end();
                this.newline();
            }
        });

        workspace.views.containerViews.forEach((view) => {
            if (view.softwareSystem) {
                this.start(this.CONTAINER_VIEW_TOKEN, this.idModelItem(view.softwareSystem), this.quote(view.key), this.quote(view.description));
                view.elements.forEach((element) => {
                    this.formatTokens(false, new Array(this.INCLUDE_IN_VIEW_TOKEN, this.id(element.element, true)));
                });
                if (view.elements.length < 1) {
                    this.formatTokens(false, new Array(this.INCLUDE_IN_VIEW_TOKEN, '*'));
                }
                this.formatAutomaticLayout(view.automaticLayout);
                this.end();
                this.newline();
            }
        });

        workspace.views.componentViews.forEach((view) => {
            if (view.container) {
                this.start(this.COMPONENT_VIEW_TOKEN, this.idModelItem(view.container), this.quote(view.key), this.quote(view.description));
                view.elements.forEach((element) => {
                    this.start(this.INCLUDE_IN_VIEW_TOKEN, this.id(element.element, true));
                    this.end();
                });
                if (view.elements.length < 1) {
                    this.formatTokens(false, new Array(this.INCLUDE_IN_VIEW_TOKEN, '*'));
                }
                this.formatAutomaticLayout(view.automaticLayout);
                this.end();
                this.newline();
            }
        });

        workspace.views.filteredViews.forEach((view) => {
            let tags = '';
            view.tags.forEach((tag) => {
                tags += tag;
                tags += ' ';
            });
            this.start(this.FILTERED_VIEW_TOKEN, this.quote(view.baseViewKey), view.mode.toString(), this.quote(tags.trim()), this.quote(view.key), this.quote(view.description));
            this.end();
            this.newline();
        });

        // Dynamic view not supported

        workspace.views.deploymentViews.forEach((view) => {
            if (view.elements.length > 0 || view.relationships.length > 0) {
                let scope = '';
                if (!view.softwareSystemId) {
                    scope = '*';
                } else {
                    scope = this.filter(view.softwareSystem?.name);
                }
                this.start(this.DEPLOYMENT_VIEW_TOKEN, scope, this.quote(view.environment), this.quote(view.key), this.quote(view.description));
                view.elements.forEach((elementview) => {
                    if (!(elementview.element instanceof DeploymentElement)) {
                        this.start(this.INCLUDE_IN_VIEW_TOKEN, this.filter(elementview.element.name));
                        this.end();
                    }
                });
                this.formatAutomaticLayout(view.automaticLayout);
                this.end();
                this.newline();
            }
        });

        if (workspace.views.configuration.styles) {
            this.start(this.STYLES_TOKEN);
            workspace.views.configuration.styles.toTheme().elements.forEach((element) => {
                let hasProperties = false;
                let e = element as ElementStyle;
                this.start(this.ELEMENT_STYLE_TOKEN, this.quote(e.tag));
                if (e.shape){
                    hasProperties = true;
                    this.start(this.ELEMENT_STYLE_SHAPE_TOKEN, this.quote(e.shape));
                    this.end();
                }
                if (e.icon){
                    hasProperties = true;
                    this.start(this.ELEMENT_STYLE_ICON_TOKEN, this.quote(e.icon));
                    this.end();
                }
                if (e.width){
                    hasProperties = true;
                    this.start(this.ELEMENT_STYLE_WIDTH_TOKEN, this.quote(e.width.toString()));
                    this.end();
                }
                if (e.height){
                    hasProperties = true;
                    this.start(this.ELEMENT_STYLE_HEIGHT_TOKEN, this.quote(e.height.toString()));
                    this.end();
                }
                if (e.background){
                    hasProperties = true;
                    this.start(this.ELEMENT_STYLE_BACKGROUND_TOKEN, this.quote(e.background));
                    this.end();
                }
                if (e.color){
                    hasProperties = true;
                    this.start(this.ELEMENT_STYLE_COLOR_TOKEN, this.quote(e.color));
                    this.end();
                }
                if (e.stroke){
                    hasProperties = true;
                    this.start(this.ELEMENT_STYLE_STROKE_TOKEN, this.quote(e.stroke));
                    this.end();
                }
                if (e.fontSize){
                    hasProperties = true;
                    this.start(this.ELEMENT_STYLE_FONT_SIZE_TOKEN, this.quote(e.fontSize.toString()));
                    this.end();
                }
                if (e.border){
                    hasProperties = true;
                    this.start(this.ELEMENT_STYLE_BORDER_TOKEN, this.quote(e.border));
                    this.end();
                }
                if (e.opacity){
                    hasProperties = true;
                    this.start(this.ELEMENT_STYLE_OPACITY_TOKEN, this.quote(e.opacity.toString()));
                    this.end();
                }
                if (e.metadata){
                    hasProperties = true;
                    this.start(this.ELEMENT_STYLE_METADATA_TOKEN, this.quote(String(e.metadata)));
                    this.end();
                }
                if (e.description){
                    hasProperties = true;
                    this.start(this.ELEMENT_STYLE_DESCRIPTION_TOKEN, this.quote(String(e.description)));
                    this.end();
                }
                if (hasProperties){
                    this.start("# empty style");
                    this.end();
                }
                this.end();
            });
            workspace.views.configuration.styles.toTheme().relationships.forEach((element) => {
                let hasProperties = false;
                let e = element as RelationshipStyle;
                this.start(this.RELATIONSHIP_STYLE_TOKEN, this.quote(e.tag));
                if (e.thickness){
                    hasProperties = true;
                    this.start(this.RELATIONSHIP_STYLE_THICKNESS_TOKEN, this.quote(e.thickness.toString()));
                    this.end();
                }
                if (e.color){
                    hasProperties = true;
                    this.start(this.RELATIONSHIP_STYLE_COLOR_TOKEN, this.quote(e.color));
                    this.end();
                }
                if (e.dashed){
                    hasProperties = true;
                    this.start(this.RELATIONSHIP_STYLE_DASHED_TOKEN, this.quote(String(e.dashed)));
                    this.end();
                }
                if (e.routing){
                    hasProperties = true;
                    this.start(this.RELATIONSHIP_STYLE_ROUTING_TOKEN, this.quote(e.routing));
                    this.end();
                }
                if (e.fontSize){
                    hasProperties = true;
                    this.start(this.RELATIONSHIP_STYLE_FONT_SIZE_TOKEN, this.quote(e.fontSize.toString()));
                    this.end();
                }
                if (e.width){
                    hasProperties = true;
                    this.start(this.RELATIONSHIP_STYLE_WIDTH_TOKEN, this.quote(e.width.toString()));
                    this.end();
                }
                if (e.position){
                    hasProperties = true;
                    this.start(this.RELATIONSHIP_STYLE_POSITION_TOKEN, this.quote(e.position.toString()));
                    this.end();
                }
                if (e.opacity){
                    hasProperties = true;
                    this.start(this.RELATIONSHIP_STYLE_OPACITY_TOKEN, this.quote(e.opacity.toString()));
                    this.end();
                }
                if (hasProperties){
                    this.start("# empty style");
                    this.end();
                }
                this.end();
            });
            this.end();
        }

        if (workspace.views.configuration.theme) {
            this.formatTokens(false, new Array(this.THEMES_TOKEN, this.quote(workspace.views.configuration.theme)));
            //this.start(this.THEMES_TOKEN, this.quote(workspace.views.configuration.theme));
            //this.end();
        }
        
        if (workspace.views.configuration.branding){
            let branding = workspace.views.configuration.branding;
            this.newline();
            this.start(this.BRANDING_TOKEN);
            if (branding.logo){
                this.start(this.BRANDING_LOGO_TOKEN, this.quote(branding.logo));
                this.end();
            }
            if (branding.font){
                if (branding.font.url){
                    this.start(this.BRANDING_FONT_TOKEN, this.quote(branding.font.name), this.quote(branding.font.url));
                    this.end();
                } else if (branding.font.name) {
                    this.start(this.BRANDING_FONT_TOKEN, this.quote(branding.font.name));
                    this.end();
                }
            }
            this.end();
        }

        // End Views Section
        this.newline();
        this.end();

        // End Workspace
        this.newline();
        this.end();
        
        return this.buf;
    }

    start(...tokens:string[]){
        // Remove empty strings
        const cleanTokens = tokens.filter(e => e);
        this.formatTokens(true, cleanTokens);
        this.indent++;
    }

    end(){
        this.indent--;
        this.formatTokens(false, new Array(DslContext.CONTEXT_END_TOKEN));
    }

    newline() {
        this.buf += '\n';
    }

    quote(content?: string){
        let s = '';
        if (content){
            s = content.replace(/\n/g," ");
            s = s.replace(/\\"/g, '\\\\"');
        }
        return '"' + s + '"';
    }

    formatTokens(startContext: boolean, tokens:string[]){
        this.indentText();
        for (var i=0; i < tokens.length; i++){
            this.buf += tokens[i];
            if (i < tokens.length - 1){
                this.buf += ' ';
            }
        }

        if (startContext === true){
            this.buf += ' ';
            this.buf += DslContext.CONTEXT_START_TOKEN;
        }

        this.newline();
    }

    formatModelItem(modelItem: ModelItem) {
        // Wants to find URL, PROPERTIES and PERSPECTIVES which do not seem to exist here!
    }

    formatPerson(person: Person): void {
        this.start(this.idModelItem(person), this.ASSIGNMENT_OPERATOR_TOKEN, this.PERSON_TOKEN, this.quote(person.name), this.quote(person.description), this.quote(this.tags(person)));
        this.formatModelItem(person);
        this.end();
    }

    formatSoftwareSystem(system: SoftwareSystem) {
        this.start(this.idModelItem(system), this.ASSIGNMENT_OPERATOR_TOKEN, this.SOFTWARE_SYSTEM_TOKEN, this.quote(system.name), this.quote(system.description), this.quote(this.tags(system)));
        this.formatModelItem(system);
        system.containers.forEach((container) => { this.formatContainer(container); });
        this.end();
    }

    formatContainer(container: Container) {
        this.start(this.idModelItem(container), this.ASSIGNMENT_OPERATOR_TOKEN, this.CONTAINER_TOKEN, this.quote(container.name), this.quote(container.description), this.quote(container.technology), this.quote(this.tags(container)));
        this.formatModelItem(container);
        container.components.forEach((component) => { this.formatComponent(component); });
        this.end();
    }

    formatComponent(component: Component) {
        this.start(this.idModelItem(component), this.ASSIGNMENT_OPERATOR_TOKEN, this.COMPONENT_TOKEN, this.quote(component.name), this.quote(component.description), this.quote(component.technology), this.quote(this.tags(component)));
        this.formatModelItem(component);
        this.end();
    }

    formatDeploymentNode(node: DeploymentNode) {
        this.start(this.idModelItem(node), this.ASSIGNMENT_OPERATOR_TOKEN, this.DEPLOYMENT_NODE_TOKEN, this.quote(node.name), this.quote(node.description), this.quote(node.technology), this.quote(this.tags(node)));
        this.formatModelItem(node);
        // Does not seem to have infra nodes or software system nodes but does have container instances
        node.containerInstances.forEach((instance) => { this.formatContainerInstance(instance); });
        node.children.forEach((child) => { this.formatDeploymentNode(child); });
        this.end();
    }

    formatContainerInstance(instance: ContainerInstance) {
        this.start(this.idModelItem(instance), this.ASSIGNMENT_OPERATOR_TOKEN, this.CONTAINER_INSTANCE_TOKEN, this.filter(instance.container?.name), this.quote(""), this.quote(this.tags(instance)));
    }

    formatAutomaticLayout(automaticLayout: AutomaticLayout | undefined) {
        if (automaticLayout) {
            let direction = 'tb';
            switch (automaticLayout.rankDirection) {
                case RankDirection.TopBottom:
                    direction = 'tb';
                    break;
                case RankDirection.BottomTop:
                    direction = 'bt';
                    break;
                case RankDirection.LeftRight:
                    direction = 'lr';
                    break;
                case RankDirection.RightLeft:
                    direction = 'rl';
                    break;
            }
            this.formatTokens(false, new Array(this.AUTOLAYOUT_VIEW_TOKEN, direction, automaticLayout.rankSeparation?.toString() || '', automaticLayout.nodeSeparation?.toString() || ''));
        }
    }

    idModelItem(modelItem: ModelItem) {
        // if (modelItem instanceof Person){
        //     return this.idPerson(modelItem as Person);
        // } else if (modelItem instanceof SoftwareSystem) {
        //     return this.idSoftwareSystem(modelItem as SoftwareSystem);
        // } else if (modelItem instanceof Container){
        //     return this.idContainer(modelItem as Container);
        // } else if (modelItem instanceof Component){
        //     return this.idComponent(modelItem as Component);
        // } else if (modelItem instanceof DeploymentNode){
        //     return this.idDeploymentNode(modelItem as DeploymentNode);
        // } else if (modelItem instanceof ContainerInstance) {
        //     return this.idContainerInstance(modelItem as ContainerInstance);
        // }
        return modelItem.id;
    }
    // idContainerInstance(arg0: ContainerInstance) {
    //     return this.filter(arg0.name + '_' + arg0.instanceId);
    // }
    // idDeploymentNode(arg0: DeploymentNode) {
    //     return this.filter(arg0.name);
    // }
    // idComponent(arg0: Component) {
    //     return this.filter(arg0.name);
    // }
    // idContainer(arg0: Container) {
    //     return this.filter(arg0.name);
    // }
    // idSoftwareSystem(arg0: SoftwareSystem) {
    //     return this.filter(arg0.name);
    // }
    // idPerson(arg0: Person) {
    //     return this.filter(arg0.name);
    // }

    id(modelItem: ModelItem, hierarchical: boolean): string {
        if (hierarchical) {
            if (modelItem instanceof Element){
                let element = modelItem as Element;
                if (element.parent){
                    return this.id(element.parent, true) + '.' + this.idModelItem(modelItem);
                } else {
                    if (element instanceof DeploymentNode){
                        let dn = element as DeploymentNode;
                        return this.filter(dn.environment) + '.' + this.idModelItem(dn);
                    } else {
                        return this.idModelItem(element);
                    }
                }
            }
        }
        return this.idModelItem(modelItem);
    }

    indentText(){
        for (var i:number = 0; i< this.indent * 4; i++ ){
            this.buf += ' ';
        }
    }

    tags(element: Element): string {
        let tags = element.tags;

        if (element instanceof Person){
            tags.add("Element");
            tags.add("Person");
        } else if (element instanceof SoftwareSystem) {
            tags.add("Element");
            tags.add("Software System");
        } else if (element instanceof Container) {
            tags.add("Element");
            tags.add("Container");
        } else if (element instanceof Component) {
            tags.add("Element");
            tags.add("Component");
        } else if (element instanceof DeploymentNode) {
            tags.add("Element");
            tags.add("Deployment Node");
        } else if (element instanceof ContainerInstance) {
            tags.add("Container Instance");
        }

        return tags.asArray().toString();
    }

    tagsRelationship(rel: Relationship): string {
        let tags = rel.getRequiredTags();
        let defaultTag = 'Relationship';
        let ptr = tags.findIndex(s => s === defaultTag);
        if (ptr >= 0){
            tags.splice(ptr,1);
        }
        return tags.join();
    }

    filter(name?: string): string {
        if (name){
            return name.replace(/\W/g, "");
        }
        else {
            return "";
        }
    }
}
