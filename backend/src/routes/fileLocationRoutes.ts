import express, { Router, Response } from "express";
import { AuthenticatedRequest, authenticateToken, getUser } from "../middelware";
import FileLocation from "../models/fileLocation.model";
import { createFileLocation, deleteFileLocation } from "../services/fileLocation.service";


const router: Router = express.Router();

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const fileLocations = await FileLocation.find({
            organisationId: user.organisationId
        });
        res.json(fileLocations);
    }
    catch(err: any){
        res.status(400).json({ error: err.message });
    }
});

router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const result = await createFileLocation(user, req.body.name, req.body.viewId);
        res.status(201).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const result = await deleteFileLocation(user, req.params.id as string);
        res.status(result.status).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;