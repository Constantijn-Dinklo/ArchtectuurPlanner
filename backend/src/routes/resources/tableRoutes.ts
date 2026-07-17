import express, { Router, Response } from "express";

import Table from "../../models/resources/table.model";
import { AuthenticatedRequest, authenticateToken, getUser } from "../../middelware";
import { createTable } from "../../services/table.service";

const router: Router = express.Router();

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    
    try {
        const tables = await Table.find({
            organisationId: user.organisationId
        });
        res.json(tables);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const result = await createTable(user, req.body.name, req.body.databaseId, req.body.viewId);
        res.status(201).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.patch('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const updated = await Table.findOneAndUpdate(
            {
                _id: req.params.id,
                organisationId: user.organisationId
            },
            { $set: req.body },
            { returnDocument: 'after'}
        );
        res.json(updated)
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    
    try {
        const deleted = await Table.findOneAndDelete(
            {
                _id: req.params.id,
                organisationId: user.organisationId
            },
            { returnDocument: 'after' }
        );
        res.json(deleted);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
})

export default router;