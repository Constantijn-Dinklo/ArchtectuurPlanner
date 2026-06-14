import { UserJwtPayload } from "../middelware";
import ViewNode from "../models/canvas/viewNode.model";
import Resource, { ResourceType } from "../models/resource.model";

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
        // res.status(400).json({ error: err.message });
    }
}