import express, { Router, Response } from "express";

import { AuthenticatedRequest, getUser } from "../middelware";
import ResourceFieldRelation from "../models/information/resourceFieldRelation.model";
import ResourceObjectRelation from "../models/information/resourceObjectRelation.model";

const router: Router = express.Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const fieldRelations = await ResourceFieldRelation.find({
            environmentId: user.environmentId
        });
        const objectRelations = await ResourceObjectRelation.find({
            environmentId: user.environmentId
        });
        res.json({ fieldRelations, objectRelations });
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Sets the connection the information travels through. Both values null means "not chosen"
function getViaPatch(body: any) {
    const viaConnectionType = body.viaConnectionType ?? null;
    if(viaConnectionType !== null && !['api', 'script', 'database', 'other', 'component'].includes(viaConnectionType)) {
        throw new Error("Unknown connection type");
    }
    return {
        viaConnectionType,
        viaConnectionId: viaConnectionType ? body.viaConnectionId ?? null : null
    };
}

router.patch('/fields/:id', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const updated = await ResourceFieldRelation.findOneAndUpdate(
            {
                _id: req.params.id,
                environmentId: user.environmentId
            },
            { $set: getViaPatch(req.body) },
            { returnDocument: 'after' }
        );
        if(!updated) { return res.status(404).json({ error: "Relation not found" }); }
        res.json(updated);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.patch('/objects/:id', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const updated = await ResourceObjectRelation.findOneAndUpdate(
            {
                _id: req.params.id,
                environmentId: user.environmentId
            },
            { $set: getViaPatch(req.body) },
            { returnDocument: 'after' }
        );
        if(!updated) { return res.status(404).json({ error: "Relation not found" }); }
        res.json(updated);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
