import express, { Router, Response } from "express";

import { AuthenticatedRequest, getUser } from "../middelware";
import {
    connectParts,
    createConnection,
    getConnections,
    parseConnectionInput,
    updateConnection
} from "../services/connection.service";
import { deleteConnectionWithRelations } from "../services/informationRelation.service";

const router: Router = express.Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await getConnections(getUser(req)));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.status(201).json(await createConnection(getUser(req), parseConnectionInput(req.body)));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Connects two parts when nothing connects them yet, with the kind that fits them (a table through its database)
router.post('/connect', async (req: AuthenticatedRequest, res: Response) => {
    try {
        if(typeof req.body.sourceId !== 'string' || typeof req.body.targetId !== 'string') throw new Error("Choose what to connect");
        res.status(201).json(await connectParts(getUser(req), req.body.sourceId, req.body.targetId));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Only the kind (with its fields) and the description change; the ends of a connection stay the same
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const updated = await updateConnection(getUser(req), req.params.id as string, {
            kind: req.body.kind,
            apiId: req.body.apiId,
            description: req.body.description
        });
        if(!updated) return res.status(404).json({ error: "Connection not found" });
        res.json(updated);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Everything that goes through the connection goes with it
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const deleted = await deleteConnectionWithRelations(getUser(req), req.params.id as string);
        if(!deleted) return res.status(404).json({ error: "Connection not found" });
        res.json(deleted);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
