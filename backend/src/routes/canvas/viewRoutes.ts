import express, { Router, Response } from "express";
import { AuthenticatedRequest, getUser } from "../../middelware";
import View from "../../models/canvas/view.model";
import ViewNode from "../../models/canvas/viewNode.model";

const router: Router = express.Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    
    try {
        const views = await View.find({
            environmentId: user.environmentId,
        });
        res.json(views);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/:viewId/nodes', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const viewNodes = await ViewNode.find({
            environmentId: user.environmentId,
            viewId: req.params.viewId
        });
        res.json(viewNodes);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.patch('/:viewId/nodes/:nodeId', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const updated = await ViewNode.findOneAndUpdate(
            {
                _id: req.params.nodeId,
                viewId: req.params.viewId,
                environmentId: user.environmentId,
            },
            { $set: req.body },
            { returnDocument: 'after'}
        );
        res.json(updated);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;