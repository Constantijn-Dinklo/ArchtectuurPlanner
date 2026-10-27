import express, { Router, Response } from "express";
import { AuthenticatedRequest, getUser } from "../middelware";
import DatabaseConnection from "../models/databaseConnection.model";

const router: Router = express.Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const databaseConnections = await DatabaseConnection.find({
            environmentId: user.environmentId
        });
        res.json(databaseConnections);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const databaseConnectionBody = {
            environmentId: user.environmentId,
            databaseId: req.body.databaseId === '' ? null : req.body.databaseId,
            entityId: req.body.entityId === '' ? null : req.body.entityId,
            operation: ['read']
        }
        const databaseConnection = new DatabaseConnection(databaseConnectionBody);
        await databaseConnection.save();

        res.status(201).json(databaseConnection);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const updated = await DatabaseConnection.findOneAndUpdate(
            {
                _id: req.params.id,
                environmentId: user.environmentId
            },
            { $set: req.body },
            { returnDocument: 'after' }
        );
        res.json(updated);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const updated = await DatabaseConnection.findOneAndDelete(
            {
                _id: req.params.id,
                environmentId: user.environmentId
            },
            { returnDocument: 'after' }
        );
        res.json(updated);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
