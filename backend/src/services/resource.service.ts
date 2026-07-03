import { UserJwtPayload } from "../middelware";
import ApiConnection from "../models/apiConnection.model";
import ViewNode from "../models/canvas/viewNode.model";
import DatabaseConnection from "../models/databaseConnection.model";
import Resource, { ResourceType } from "../models/resource.model";
import Server from "../models/server.model";

export async function createResource(user: UserJwtPayload, name: string, resourceType: ResourceType, viewId: string) {
    try {
        const resourceBody = {
            organisationId: user.organisationId,
            name: name,
            type: resourceType
        }
        const resource = new Resource(resourceBody);
        await resource.save();

        const nodeBody = {
            organisationId: user.organisationId,
            viewId: viewId,
            entityId: resource._id,
            entityType: resourceType,
            position: {
                x: Math.random() * 400,
                y: Math.random() * 400
            }
        }
        const viewNode = new ViewNode(nodeBody);
        await viewNode.save();

        return {
            resource,
            viewNode
        };
    }
    catch(err: any) {
        throw new Error(err.message);
    }
}

export async function deleteResource(user: UserJwtPayload, resourceId: string) {
    
    try {
        const resource = await Resource.findOne({
            _id: resourceId,
            organisationId: user.organisationId
        });

        if(resource && resource.type === 'application'){
            const result = await canApplicationBeRemoved(user, resourceId);
            if(!result.success) return result;
        }
        else if(resource && resource.type === 'database'){
           const result = await canDatabaseBeRemoved(user, resourceId);
           if(!result.success) return result;
        }

        const deletedNode = await ViewNode.findOneAndDelete({
            organisationId: user.organisationId,
            entityId: resourceId
        });

        const deleted = await Resource.findOneAndDelete({
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

async function canApplicationBeRemoved(user: UserJwtPayload, resourceId: string) {
    const apiConnections = await ApiConnection.find({
        organisationId: user.organisationId,
        $or: [ 
            { sourceId: resourceId },
            { targetId: resourceId }
        ]
    });
    if(apiConnections.length > 0){
        return {
            status: 409,
            success: false,
            message: "Cannot delete Application because it is still being used",
            dependencies: {
                apiConnections: apiConnections.map(connection => {
                    id: connection._id
                })
            }
        }
    }
    return {
        status: 200,
        success: true
    }
}

async function canDatabaseBeRemoved(user: UserJwtPayload, resourceId: string) {
    const databaseConnections = await DatabaseConnection.find({
        organisationId: user.organisationId,
        databaseId: resourceId
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
            $in: [resourceId]
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