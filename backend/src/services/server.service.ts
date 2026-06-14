import { UserJwtPayload } from "../middelware";
import ViewNode from "../models/canvas/viewNode.model";
import Server from "../models/server.model";


export async function createServer(user: UserJwtPayload, name: string, viewId: string) {
    
    try {
        const serverBody = {
            organisationId: user.organisationId,
            name: name,
            IP: '',
            entityIds: []
        }

        const server = new Server(serverBody);
        await server.save();

        const nodeBody = {
            organisationId: user.organisationId,
            viewId: viewId,
            entityId: server._id,
            entityType: 'server',
            position: {
                x: Math.random() * 400,
                y: Math.random() * 400
            }
        }
        const viewNode = new ViewNode(nodeBody);
        await viewNode.save();

        return {
            server,
            viewNode
        };
    }
    catch(err: any) {
        throw new Error(err.message);
    }
}