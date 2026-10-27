import { removeResourceRelations } from "./externalRelation.service";
import Table from "../models/resources/table.model";
import { UserJwtPayload } from "../middelware";
import ViewNode from "../models/canvas/viewNode.model";
import Database from "../models/resources/database.model";
import DatabaseConnection from "../models/databaseConnection.model";
import Server from "../models/resources/server.model";


export async function createDatabase(user: UserJwtPayload, name: string, viewId: string) {
    try {
        const databaseBody = {
            environmentId: user.environmentId,
            name: name,
        }
        const database = new Database(databaseBody);
        await database.save();

        const nodeBody = {
            environmentId: user.environmentId,
            viewId: viewId,
            entityId: database._id,
            entityType: 'database',
            position: {
                x: Math.random() * 400,
                y: Math.random() * 400
            }
        }
        const viewNode = new ViewNode(nodeBody);
        await viewNode.save();

        return {
            database,
            viewNode
        };
    }
    catch(err: any) {
        throw new Error(err.message);
    }
}

export async function deleteDatabase(user: UserJwtPayload, resourceId: string) {
    
    try {
        const result = await canDatabaseBeRemoved(user, resourceId);
        if(!result.success) return result;

        const deletedNode = await ViewNode.findOneAndDelete({
            environmentId: user.environmentId,
            entityId: resourceId
        });

        const deleted = await Database.findOneAndDelete({
            _id: resourceId,
            environmentId: user.environmentId
        });

        if (!deleted || !deletedNode) {
            return {
                status: 403,
                success: false,
                message: 'The Resource was not deleted correctly.',
            }
        }
        // The tables of the database are removed with it, including their nodes on the canvas and their relations
        const tables = await Table.find({ environmentId: user.environmentId, databaseId: resourceId });
        const tableIds = tables.map((table) => table._id.toString());
        const tableViewNodes = await ViewNode.find({ environmentId: user.environmentId, entityId: { $in: tableIds } });

        await ViewNode.deleteMany({ environmentId: user.environmentId, entityId: { $in: tableIds } });
        await Table.deleteMany({ environmentId: user.environmentId, databaseId: resourceId });
        await removeResourceRelations(user, [resourceId, ...tableIds]);

        return {
            status: 200,
            success: true,
            message: 'Resource deleted successfully',
            resourceId: deleted._id,
            viewNodeId: deletedNode._id,
            deletedTableIds: tableIds,
            deletedTableViewNodeIds: tableViewNodes.map((viewNode) => viewNode._id.toString())
        }
    }
    catch(err: any) {
        throw new Error(err.message);
    }
}

async function canDatabaseBeRemoved(user: UserJwtPayload, databaseId: string) {
    const databaseConnections = await DatabaseConnection.find({
        environmentId: user.environmentId,
        databaseId: databaseId
    });
    if(databaseConnections.length > 0){
        return {
            status: 409,
            success: false,
            message: "Cannot delete Database because it is still being used",
            dependencies: {
                databaseConnections: databaseConnections.map(connection => {
                    id: connection._id
                })
            }
        } 
    }

    const servers = await Server.find({
        environmentId: user.environmentId,
        entityIds: {
            $in: [databaseId]
        }
    });
    if(servers.length > 0){
        return {
            status: 409,
            success: false,
            message: "Cannot delete Database becaues it is still being used",
            dependencies: {
                servers: servers.map(server => {
                    id: server._id
                })
            }
        }
    }

    return {
        status: 200,
        success: true
    }
}