import express, { Router, Response } from "express";
import { AuthenticatedRequest, authenticateToken, getUser } from "../middelware";
import Server from "../models/server.model";
import { addEntity, createServer, updateServerEntityIds } from "../services/server.service";
import ViewNode from "../models/canvas/viewNode.model";

const router: Router = express.Router();

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    
    try {
        const servers = await Server.find({
            organisationId: user.organisationId
        });
        res.json(servers);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const result = await createServer(user, req.body.name, req.body.viewId);
        res.status(201).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.patch('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const updated = await Server.findOneAndUpdate(
            {
                _id: req.params.id,
                organisationId: user.organisationId
            },
            { $set: req.body },
            { returnDocument: 'after'}
        );        
        res.status(201).json(updated);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    //Should be moved to server.service.ts
    try {
        const server = await Server.findOne({
            _id: req.params.id,
            organisationId: user.organisationId,
        });

        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }

        if (server.entityIds.length > 0) {
            return res.status(400).json({
                message: 'Cannot delete server because it still contains entities.',
            });
        }

        const deletedNode = await ViewNode.findOneAndDelete({
            organisationId: user.organisationId,
            entityId: req.params.id
        });

        if(!deletedNode) {
            return res.status(403).json({
                success: false,
                message: 'The Server was not deleted correctly.',
            });
        }

        await server.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Server deleted successfully',
            serverId: server._id,
            viewNodeId: deletedNode._id
        });
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
})

router.post('/:id/entity', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    const result = await addEntity(user, req.params.id as string, req.body.entityId);
    res.status(201).json(result?.entityIds);
});

router.patch('/:id/entity', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    const result = await updateServerEntityIds(user, req.params.id as string, req.body.entityIds);
    res.status(201).json(result);
});

export default router;