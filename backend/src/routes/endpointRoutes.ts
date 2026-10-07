import express, { Router, Response } from "express";
import Endpoint, { ENDPOINT_TYPES } from "../models/endpoint.model";
import { AuthenticatedRequest, authenticateToken, getUser } from "../middelware";

const router: Router = express.Router();

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const endpoints = await Endpoint.find({
            organisationId: user.organisationId
        });
        res.json(endpoints);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const { resourceId, resourceType, name, type } = req.body;
        if(!resourceId || !resourceType) {
            throw new Error("An endpoint needs a resource");
        }
        if(!name?.trim()) {
            throw new Error("An endpoint needs a name");
        }

        const endpoint = new Endpoint({
            organisationId: user.organisationId,
            resourceId,
            resourceType,
            name: name.trim(),
            type: ENDPOINT_TYPES.includes(type) ? type : 'other'
        });
        await endpoint.save();

        res.status(201).json(endpoint);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.patch('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        // The resource and the information are not changed here; the information has its own routes
        const { name, type } = req.body;
        const patch: Record<string, unknown> = {};
        if(name !== undefined) {
            if(!name.trim()) throw new Error("An endpoint needs a name");
            patch.name = name.trim();
        }
        if(type !== undefined) {
            if(!ENDPOINT_TYPES.includes(type)) throw new Error("Unknown endpoint type");
            patch.type = type;
        }

        const updated = await Endpoint.findOneAndUpdate(
            {
                _id: req.params.id,
                organisationId: user.organisationId
            },
            { $set: patch },
            { returnDocument: 'after' }
        );
        if(!updated) { return res.status(404).json({ error: "Endpoint not found" }); }
        res.json(updated);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const deleted = await Endpoint.findOneAndDelete({
            _id: req.params.id,
            organisationId: user.organisationId
        });
        res.json(deleted);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

// <-- Information used in the endpoint -->
async function updateInformation(user: ReturnType<typeof getUser>, endpointId: string, update: Record<string, unknown>) {
    const endpoint = await Endpoint.findOneAndUpdate(
        {
            _id: endpointId,
            organisationId: user.organisationId
        },
        update,
        { returnDocument: 'after' }
    );
    if(!endpoint) {
        throw new Error("Endpoint not found");
    }
    return endpoint;
}

router.post('/:id/informationFields', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await updateInformation(getUser(req), req.params.id as string, {
            $addToSet: { informationFieldIds: req.body.informationFieldId }
        });
        res.status(201).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id/informationFields/:informationFieldId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await updateInformation(getUser(req), req.params.id as string, {
            $pull: { informationFieldIds: req.params.informationFieldId }
        });
        res.status(200).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/:id/informationObjects', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await updateInformation(getUser(req), req.params.id as string, {
            $addToSet: { informationObjectIds: req.body.informationObjectId }
        });
        res.status(201).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id/informationObjects/:informationObjectId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await updateInformation(getUser(req), req.params.id as string, {
            $pull: { informationObjectIds: req.params.informationObjectId }
        });
        res.status(200).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
