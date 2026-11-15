import express, { Router, Response } from "express";

import { AuthenticatedRequest, getUser } from "../middelware";
import { connectResources, disconnectResources } from "../services/resourceConnection.service";

// Connects two resources with the kind of connection they need, or removes everything between them
const router: Router = express.Router();

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        await connectResources(getUser(req), req.body.sourceId, req.body.targetId);
        res.status(201).json({ message: "Connected" });
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:sourceId/:targetId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        await disconnectResources(getUser(req), req.params.sourceId as string, req.params.targetId as string);
        res.json({ message: "Disconnected" });
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
