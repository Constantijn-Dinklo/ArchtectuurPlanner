import express, { Router, Response } from "express";
import HumanConnection from "../models/humanConnection.model";
import { AuthenticatedRequest, authenticateToken, getUser } from "../middelware";
import {
    addHumanConnectionInformationField,
    addHumanConnectionInformationObject,
    removeHumanConnectionInformationField,
    removeHumanConnectionInformationObject
} from "../services/humanConnection.service";

const router: Router = express.Router();

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const humanConnections = await HumanConnection.find({
            organisationId: user.organisationId
        });
        res.json(humanConnections);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const humanConnection = new HumanConnection({
            organisationId: user.organisationId,
            sourceId: req.body.sourceId || null,
            targetId: req.body.targetId || null,
            description: req.body.description ?? ''
        });
        await humanConnection.save();

        res.status(201).json(humanConnection);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.patch('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        // The carried information depends on the source, so it is only changed through its own routes
        const { sourceId, targetId, description } = req.body;
        const patch: Record<string, unknown> = {};
        if(sourceId !== undefined) patch.sourceId = sourceId || null;
        if(targetId !== undefined) patch.targetId = targetId || null;
        if(description !== undefined) patch.description = description;

        const update: Record<string, unknown> = { $set: patch };
        // A new source means the carried information no longer belongs to it
        if(sourceId !== undefined) {
            patch.informationFieldIds = [];
            patch.informationObjectIds = [];
        }

        const updated = await HumanConnection.findOneAndUpdate(
            {
                _id: req.params.id,
                organisationId: user.organisationId
            },
            update,
            { returnDocument: 'after' }
        );
        res.json(updated);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const deleted = await HumanConnection.findOneAndDelete(
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
});

// <-- Information carried over by the human connection -->
router.post('/:id/informationFields', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const result = await addHumanConnectionInformationField(user, req.params.id as string, req.body.informationFieldId);
        res.status(201).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id/informationFields/:informationFieldId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const result = await removeHumanConnectionInformationField(user, req.params.id as string, req.params.informationFieldId as string);
        res.status(200).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/:id/informationObjects', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const result = await addHumanConnectionInformationObject(user, req.params.id as string, req.body.informationObjectId);
        res.status(201).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id/informationObjects/:informationObjectId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const result = await removeHumanConnectionInformationObject(user, req.params.id as string, req.params.informationObjectId as string);
        res.status(200).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
