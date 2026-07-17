import { UserJwtPayload } from "../middelware";
import ViewNode from "../models/canvas/viewNode.model";
import Table from "../models/resources/table.model";

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