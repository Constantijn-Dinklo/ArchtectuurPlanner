import express, { Router, Response } from "express";

import { AuthenticatedRequest, getUser } from "../middelware";
import ResourceFieldRelation from "../models/information/resourceFieldRelation.model";
import ResourceObjectRelation from "../models/information/resourceObjectRelation.model";
import { addInformationRelation, removeInformationRelation, setRelationConnection } from "../services/informationRelation.service";
import { keepExternalSourceRelationsInSync } from "../services/externalSourceRelation.service";

const router: Router = express.Router();

function getKind(value: unknown) {
    if(value !== 'field' && value !== 'object') throw new Error("Unknown kind of information");
    return value;
}

// The kind in a path: 'fields' or 'objects'
function getPathKind(value: unknown) {
    return getKind(value === 'fields' ? 'field' : value === 'objects' ? 'object' : undefined);
}

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

// What a resource receives from or sends to another resource, added by hand. The receiver gets the information as well
router.post('/', keepExternalSourceRelationsInSync, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const relation = await addInformationRelation(getUser(req), {
            kind: getKind(req.body.kind),
            informationId: req.body.informationId,
            sourceResourceId: req.body.sourceResourceId,
            targetResourceId: req.body.targetResourceId,
            connectionId: req.body.connectionId ?? null
        });
        res.status(201).json(relation);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Moves the relation to another connection between the same two resources
router.patch('/:kind/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        if(typeof req.body.connectionId !== 'string') throw new Error("Choose a connection");
        const updated = await setRelationConnection(getUser(req), getPathKind(req.params.kind), req.params.id as string, req.body.connectionId);
        if(!updated) return res.status(404).json({ error: "Relation not found" });
        res.json(updated);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:kind/:id', keepExternalSourceRelationsInSync, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await removeInformationRelation(getUser(req), getPathKind(req.params.kind), req.params.id as string);
        if(result.status !== 200) return res.status(result.status).json({ error: result.message });
        res.json({ message: result.message });
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
