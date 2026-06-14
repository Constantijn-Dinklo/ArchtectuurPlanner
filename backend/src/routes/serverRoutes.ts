import express, { Router, Request, Response } from "express";
import { AuthenticatedRequest, authenticateToken, getUser } from "../middelware";
import Server from "../models/server.model";
import { createServer } from "../services/server.service";

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

export default router;