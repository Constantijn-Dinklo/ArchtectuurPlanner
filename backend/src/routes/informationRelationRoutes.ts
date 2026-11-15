import express, { Router, Response } from "express";

import { AuthenticatedRequest, getUser } from "../middelware";
import ResourceFieldRelation from "../models/information/resourceFieldRelation.model";
import ResourceObjectRelation from "../models/information/resourceObjectRelation.model";
import { addInformationRelation, removeInformationRelation } from "../services/informationRelation.service";
import { keepExternalSourceRelationsInSync } from "../services/externalSourceRelation.service";

const router: Router = express.Router();

function getKind(value: unknown) {
    if(value !== 'field' && value !== 'object') throw new Error("Unknown kind of information");
    return value;
}

// What a resource receives from or sends to another resource, added by hand. The receiver gets the information as well
router.post('/', keepExternalSourceRelationsInSync, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const relation = await addInformationRelation(getUser(req), {
            kind: getKind(req.body.kind),
            informationId: req.body.informationId,
            sourceResourceId: req.body.sourceResourceId,
            targetResourceId: req.body.targetResourceId,
            viaConnectionType: req.body.viaConnectionType ?? null,
            viaConnectionId: req.body.viaConnectionId ?? null
        });
        res.status(201).json(relation);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:kind/:id', keepExternalSourceRelationsInSync, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await removeInformationRelation(getUser(req), getKind(req.params.kind === 'fields' ? 'field' : req.params.kind === 'objects' ? 'object' : undefined), req.params.id as string);
        if(result.status !== 200) return res.status(result.status).json({ error: result.message });
        res.json({ message: result.message });
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

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
    if(viaConnectionType !== null && !['api', 'database', 'other', 'component'].includes(viaConnectionType)) {
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
