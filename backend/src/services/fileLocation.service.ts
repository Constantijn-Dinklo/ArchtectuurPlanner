import { UserJwtPayload } from "../middelware";
import ApiConnection from "../models/apiConnection.model";
import Application from "../models/application.model";
import ViewNode from "../models/canvas/viewNode.model";
import FileLocation from "../models/fileLocation.model";


export async function createFileLocation(user: UserJwtPayload, name: string, viewId: string) {
    try {
        const fileLocationBody = {
            organisationId: user.organisationId,
            name: name,
        }
        const fileLocation = new FileLocation(fileLocationBody);
        await fileLocation.save();

        const nodeBody = {
            organisationId: user.organisationId,
            viewId: viewId,
            entityId: fileLocation._id,
            entityType: 'fileLocation',
            position: {
                x: Math.random() * 400,
                y: Math.random() * 400
            }
        }
        const viewNode = new ViewNode(nodeBody);
        await viewNode.save();

        return {
            fileLocation,
            viewNode
        };
    }
    catch(err: any) {
        throw new Error(err.message);
    }
}

export async function deleteFileLocation(user: UserJwtPayload, resourceId: string) {
    
    try {
        const deletedNode = await ViewNode.findOneAndDelete({
            organisationId: user.organisationId,
            entityId: resourceId
        });

        const deleted = await FileLocation.findOneAndDelete({
            _id: resourceId,
            organisationId: user.organisationId
        });

        if (!deleted || !deletedNode) {
            return {
                status: 403,
                success: false,
                message: 'The File Location was not deleted correctly.',
            }
        }
        return {
            status: 200,
            success: true,
            message: 'File Location deleted successfully',
            resourceId: deleted._id,
            viewNodeId: deletedNode._id
        }
    }
    catch(err: any) {
        throw new Error(err.message);
    }
}
