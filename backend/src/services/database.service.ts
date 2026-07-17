import { UserJwtPayload } from "../middelware";
import ViewNode from "../models/canvas/viewNode.model";
import Database from "../models/resources/database.model";
import DatabaseConnection from "../models/databaseConnection.model";
import Server from "../models/resources/server.model";


export async function createDatabase(user: UserJwtPayload, name: string, viewId: string) {
    try {
        const databaseBody = {
            organisationId: user.organisationId,
            name: name,
        }
        const database = new Database(databaseBody);
        await database.save();

        const nodeBody = {
            organisationId: user.organisationId,
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
            organisationId: user.organisationId,
            entityId: resourceId
        });

        const deleted = await Database.findOneAndDelete({
            _id: resourceId,
            organisationId: user.organisationId
        });

        if (!deleted || !deletedNode) {
            return {
                status: 403,
                success: false,
                message: 'The Resource was not deleted correctly.',
            }
        }
        return {
            status: 200,
            success: true,
            message: 'Resource deleted successfully',
            resourceId: deleted._id,
            viewNodeId: deletedNode._id
        }
    }
    catch(err: any) {
        throw new Error(err.message);
    }
}

async function canDatabaseBeRemoved(user: UserJwtPayload, databaseId: string) {
    const databaseConnections = await DatabaseConnection.find({
        organisationId: user.organisationId,
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
        organisationId: user.organisationId,
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