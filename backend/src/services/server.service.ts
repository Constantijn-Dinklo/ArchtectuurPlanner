import { UserJwtPayload } from "../middelware";
import ViewNode from "../models/canvas/viewNode.model";
import Server from "../models/resources/server.model";


export async function createServer(user: UserJwtPayload, name: string, viewId: string) {
    
    try {
        const serverBody = {
            environmentId: user.environmentId,
            name: name,
            ip: '',
            entityIds: []
        }

        const server = new Server(serverBody);
        await server.save();

        const nodeBody = {
            environmentId: user.environmentId,
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

export async function addEntity(user: UserJwtPayload, serverId: string, entityId: string) {
    const server = await Server.findOneAndUpdate(
        {
            _id: serverId,
            environmentId: user.environmentId,
        },
        {
            $addToSet: {
                entityIds: entityId,
            },
        },
        {
            returnDocument: 'after'
        }
    );

    return server;
}

export async function updateServerEntityIds(user: UserJwtPayload, serverId: string, entityIds: string[]) {
    const uniqueEntityIds = [...new Set(entityIds)];

    const server = await Server.findOneAndUpdate(
        {
            _id: serverId,
            environmentId: user.environmentId,
        },
        {
            $set: {
                entityIds: uniqueEntityIds
            },
        },
        {
            returnDocument: 'after'
        }
    );
    return server;
}