import express, { Router, Request, Response } from "express";
import Script from "../models/script.model";

const router: Router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        const scripts = await Script.find();
        res.json(scripts);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/', async (req: Request, res: Response) => {
    try {
        const scriptBody = {
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

router.patch('/:id', async (req: Request, res: Response) => {
    try {
        const updated = await Script.findOneAndUpdate(
            {_id: req.params.id},
            { $set: req.body },
            { returnDocument: 'after'}
        );
        res.json(updated)
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const deleted = await Script.findOneAndDelete(
            {_id: req.params.id},
            { returnDocument: 'after' }
        );
        res.json(deleted);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
})

export default router;