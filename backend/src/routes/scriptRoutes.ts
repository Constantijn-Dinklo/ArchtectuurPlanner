import express, { Router, Request, Response } from "express";
import Script from "../models/script.model";
import { AuthenticatedRequest, authenticateToken, getUser } from "../middelware";

const router: Router = express.Router();

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    
    try {
        const scripts = await Script.find({
            organisationId: user.organisationId
        });
        res.json(scripts);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const scriptBody = {
            organisationId: user.organisationId,
            name: req.body.name,
            inputIds: req.body.inputIds,
            outputIds: req.body.outputIds
        }

        const script = new Script(scriptBody);
        await script.save();

        res.status(201).json(script);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.patch('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const updated = await Script.findOneAndUpdate(
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
        const deleted = await Script.findOneAndDelete(
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