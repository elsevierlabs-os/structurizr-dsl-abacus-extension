/* eslint-disable @typescript-eslint/naming-convention */
export interface IAbacusConnections{
    '@odata.context': string;
    '@odata.count': number;
    value: IConnection[];
}

export interface IConnection{
    EEID: number,
    Description: string,
    Name: string,
    BaselineElementEEID: number,
    Created: Date,
    CreatedBy: string,
    Modified: Date,
    ModifiedBy: string,
    ConnectionTypeEEID: number,
    ConnectionTypeName: string,
    ArchitectureEEID: number,
    ArchitectureName: string,
    ParentEEID: number,
    SourceComponentEEID: number,
    SourceComponentName: string,
    SinkComponentEEID: number,
    SinkComponentName: string
}