import express, { Router, Response } from "express";
import { AuthenticatedRequest, authenticateToken, getUser } from "../middelware";
import Application from "../models/application.model";
import { createAppliction, deleteApplication } from "../services/application.service";


const router: Router = express.Router();

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const applications = await Application.find({
            organisationId: user.organisationId
        });
        res.json(applications);
    }
    catch(err: any){
        res.status(400).json({ error: err.message });
    }
});

router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const result = await createAppliction(user, req.body.name, req.body.viewId);
        res.status(201).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const result = await deleteApplication(user, req.params.id as string);
        res.status(result.status).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;