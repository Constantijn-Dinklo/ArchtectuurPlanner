import express, { Router, Response } from "express";
import { AuthenticatedRequest, authenticateToken, getUser } from "../../middelware";
import Database from "../../models/resources/database.model";
import { createDatabase, deleteDatabase } from "../../services/database.service";


const router: Router = express.Router();

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const databases = await Database.find({
            organisationId: user.organisationId
        });
        res.json(databases);
    }
    catch(err: any){
        res.status(400).json({ error: err.message });
    }
});

router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const result = await createDatabase(user, req.body.name, req.body.viewId);
        res.status(201).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.patch('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const updated = await Database.findOneAndUpdate(
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

    try {
        const result = await deleteDatabase(user, req.params.id as string);
        res.status(result.status).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;