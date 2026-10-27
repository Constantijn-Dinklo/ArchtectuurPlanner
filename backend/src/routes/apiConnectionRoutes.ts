import express, { Router, Response } from "express";
import ApiConnection from "../models/apiConnection.model";
import { AuthenticatedRequest, getUser } from "../middelware";

const router: Router = express.Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const apiConnections = await ApiConnection.find({
            environmentId: user.environmentId
        });
        res.json(apiConnections);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const apiConnectionBody = {
            environmentId: user.environmentId,
            sourceId: req.body.sourceId === '' ? null : req.body.sourceId,
            sourceUrlId: req.body.sourceUrlId === '' ? null : req.body.sourceUrlId,
            targetId: req.body.targetId === '' ? null : req.body.targetId
        }
        const apiConnection = new ApiConnection(apiConnectionBody);
        await apiConnection.save();
        
        res.status(201).json({
            id: apiConnection._id,
            sourceId: apiConnection.sourceId,
            sourceUrlId: apiConnection.sourceUrlId,
            targetId: apiConnection.targetId
        });
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
})

router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const updated = await ApiConnection.findOneAndUpdate(
            {
                _id: req.params.id,
                environmentId: user.environmentId
            },
            { $set: req.body},
            { returnDocument: 'after'}
        );
        res.json(updated);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
})

router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    
    try {
        const deleted = await ApiConnection.findOneAndDelete(
            {
                _id: req.params.id,
                environmentId: user.environmentId
            },
            { returnDocument: 'after'}
        )
        res.json(deleted);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
})

export default router;