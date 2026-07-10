import { UserJwtPayload } from "../middelware";
import ApiConnection from "../models/apiConnection.model";
import Application from "../models/application.model";
import ViewNode from "../models/canvas/viewNode.model";


export async function createAppliction(user: UserJwtPayload, name: string, viewId: string) {
    try {
        const applicationBody = {
            organisationId: user.organisationId,
            name: name,
        }
        const application = new Application(applicationBody);
        await application.save();

        const nodeBody = {
            organisationId: user.organisationId,
            viewId: viewId,
            entityId: application._id,
            entityType: 'application',
            position: {
                x: Math.random() * 400,
                y: Math.random() * 400
            }
        }
        const viewNode = new ViewNode(nodeBody);
        await viewNode.save();

        return {
            application,
            viewNode
        };
    }
    catch(err: any) {
        throw new Error(err.message);
    }
}

export async function deleteApplication(user: UserJwtPayload, resourceId: string) {
    
    try {
        const result = await canApplicationBeRemoved(user, resourceId);
        if(!result.success) return result;

        const deletedNode = await ViewNode.findOneAndDelete({
            organisationId: user.organisationId,
            entityId: resourceId
        });

        const deleted = await Application.findOneAndDelete({
            _id: resourceId,
            organisationId: user.organisationId
        });

        if (!deleted || !deletedNode) {
            return {
                status: 403,
                success: false,
                message: 'The Application was not deleted correctly.',
            }
        }
        return {
            status: 200,
            success: true,
            message: 'Application deleted successfully',
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