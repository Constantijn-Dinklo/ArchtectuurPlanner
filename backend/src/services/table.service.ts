import { UserJwtPayload } from "../middelware";
import ViewNode from "../models/canvas/viewNode.model";
import { createInformationField, ResourceFieldInformation } from "./resourceField.service";
import InformationField from "../models/information/informationField.model";
import { IResourceFieldExpanded, resolveResourceField } from "../models/information/resourceField.model";
import Table from "../models/resources/table.model";
import ResourceFieldRelation from "../models/information/resourceFieldRelation.model";

export async function createTable(user: UserJwtPayload, name: string, databaseId: string, viewId: string) {
    try {
        const tableBody = {
            organisationId: user.organisationId,
            databaseId: databaseId,
            name: name,
            columns: []
        }
        const table = new Table(tableBody);
        await table.save();

        const nodeBody = {
            organisationId: user.organisationId,
            viewId: viewId,
            entityId: table._id,
            entityType: 'table',
            position: {
                x: Math.random() * 400,
                y: Math.random() * 400
            }
        }
        const viewNode = new ViewNode(nodeBody);
        await viewNode.save();

        return {
            table,
            viewNode
        };
    }
    catch(err: any) {
        throw new Error(err.message);
    }
}

export async function addTableColumn(user: UserJwtPayload, tableId: string, resourceFieldInformation: ResourceFieldInformation) {
    
    let informationFieldId = undefined;
    let position = 0;
    if("fieldName" in resourceFieldInformation){
        const newInformationField = await createInformationField(user, resourceFieldInformation.fieldName);
        informationFieldId = newInformationField._id;
    }
    else {
        // Add a new ResourceFieldRelation
        const newResourceFieldRelation = await new ResourceFieldRelation({
            organisationId: user.organisationId,
            informationFieldId: resourceFieldInformation.informationFieldId,
            sourceResourceId: resourceFieldInformation.sourceResourceId,
            sourceResourceType: resourceFieldInformation.sourceResourceType,
            targetResourceId: tableId,
            targetResourceType: 'table'
        });
        newResourceFieldRelation.save();

        informationFieldId = resourceFieldInformation.informationFieldId;
        position = 1;
    }
    
    const updatedTable = await Table.findOneAndUpdate( 
        {
            _id: tableId,
            organisationId: user.organisationId
        },
        {
            $push: {
                columns: {
                    informationFieldId: informationFieldId,
                    position: 0
                }
            }
        },
        { returnDocument: 'after'}
    ).populate<{ columns: IResourceFieldExpanded[] }>('columns.informationFieldId');
    if(!updatedTable) { 
        return {
            status: 400,
            success: false,
            message: "Table not found"
        }
    }
    
    
    const resultTable = resolveTableColumns(updatedTable);
    return resultTable;
}

export async function removeTableColumn(user: UserJwtPayload, tableId: string, informationFieldId: string) {
    const updatedTable = await Table.findOneAndUpdate(
        {
            _id: tableId,
            organisationId: user.organisationId
        },
        {
            $pull: {
                columns: {
                    informationFieldId: informationFieldId,
                }
            }
        },
        { returnDocument: 'after'}
    ).populate<{ columns: IResourceFieldExpanded[] }>('columns.informationFieldId');
    if(!updatedTable) {
        return {
            status: 400,
            success: false,
            message: "Table not found"
        }
    }
    
    const resultTable = resolveTableColumns(updatedTable);
    return resultTable;
}

function resolveTableColumns(table: any) {
    return {
        ...table.toJSON(),
        columns: table.columns.map(resolveResourceField)
    }
}