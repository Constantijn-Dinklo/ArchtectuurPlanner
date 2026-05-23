import express, { Router, Request, Response } from "express";
import Connection from "../models/connection.model";

const router: Router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        const connections = await Connection.find();
        res.json(connections);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/', async (req: Request, res: Response) => {
    try {
        const connectionBody = {
            sourceId: req.body.sourceId === '' ? null : req.body.sourceId,
            targetId: req.body.targetId === '' ? null : req.body.targetId
        }
        const connection = new Connection(connectionBody);
        await connection.save();
        
        res.status(201).json({
            id: connection._id,
            sourceId: connection.sourceId,
            targetId: connection.targetId
        });
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
})

router.patch('/:id', async (req: Request, res: Response) => {
    try {
        console.log(req.body);

        const updated = await Connection.findOneAndUpdate(
            {_id: req.params.id},
            { $set: req.body},
            { returnDocument: 'after'}
        );
        console.log(updated);
        res.json(updated);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
})

export default router;