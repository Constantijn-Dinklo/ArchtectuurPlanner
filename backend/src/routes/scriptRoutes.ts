import express, { Router, Response } from "express";
import Script from "../models/script.model";
import { AuthenticatedRequest, getUser } from "../middelware";

const router: Router = express.Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    
    try {
        const scripts = await Script.find({
            environmentId: user.environmentId
        });
        res.json(scripts);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const scriptBody = {
            environmentId: user.environmentId,
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

router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const updated = await Script.findOneAndUpdate(
            {
                _id: req.params.id,
                environmentId: user.environmentId
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

router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    
    try {
        const deleted = await Script.findOneAndDelete(
            {
                _id: req.params.id,
                environmentId: user.environmentId
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