/* eslint-disable @typescript-eslint/naming-convention */
export interface IAbacusComponents{
    '@odata.context': string;
    '@odata.count': number;
    value: IComponent[];
}

export interface IComponent{
    ArchitectureEEID: number;
    ArchitectureName: string;
    BaselineElementEEID: number;
    ComponentTypeEEID: number;
    ComponentTypeName: string;
    Created: Date;
    CreatedBy: string;
    Description: string;
    EEID: number;
    Modified: Date;
    ModifiedBy: string;
    Name: string;
    ParentEEID: number;
}