import express, { Router, Request, Response } from "express";
import Api from "../models/api.model";

const router: Router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        const apis = await Api.find();
        res.json(apis)
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/', async (req: Request, res: Response) => {
    try {
        const apiBody = {
            url: req.body.url,
            applicationId: req.body.applicationId
        }

        const api = new Api(apiBody);
        await api.save();

        res.status(201).json(api);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const deleted = await Api.findOneAndDelete(
            {_id: req.params.id },
            { returnDocument: 'after'}
        );
        res.json(deleted);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;