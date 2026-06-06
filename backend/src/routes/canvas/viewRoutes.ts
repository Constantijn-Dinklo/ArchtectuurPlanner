import express, { Router, Response } from "express";
import { AuthenticatedRequest, authenticateToken, getUser } from "../../middelware";
import View from "../../models/canvas/view.model";
import ViewNode from "../../models/canvas/viewNode.model";

const router: Router = express.Router();

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    
    try {
        const views = await View.find({
            organisationId: user.organisationId,
        });
        res.json(views);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/:viewId/nodes', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const viewNodes = await ViewNode.find({
            organisationId: user.organisationId,
            viewId: req.params.viewId
        });
        res.json(viewNodes);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/:viewId/nodes', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    
    try {
        const nodeBody = {
            organisationId: user.organisationId,
            viewId: req.body.viewId,
            resourceId: req.body.resourceId,
            position: {
                x: Math.random() * 400,
                y: Math.random() * 400
            }
        }
        const viewNode = new ViewNode(nodeBody);
        await viewNode.save();

        res.status(201).json(viewNode);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.patch('/:viewId/nodes/:nodeId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const updated = await ViewNode.findOneAndUpdate(
            {
                _id: req.params.nodeId,
                viewId: req.params.viewId,
                organisationId: user.organisationId,
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