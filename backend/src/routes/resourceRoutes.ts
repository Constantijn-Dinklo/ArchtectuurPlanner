import express, { Router, Response } from "express";
import { AuthenticatedRequest, authenticateToken, getUser } from "../middelware";
import Resource from "../models/resource.model";

const router: Router = express.Router();

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const resources = await Resource.find({
            organisationId: user.organisationId
        });
        res.json(resources);
    }
    catch(err: any){
        res.status(400).json({ error: err.message });
    }
});

router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const resourceBody = {
            organisationId: user.organisationId,
            name: req.body.name,
            type: req.body.type
        }
        const resource = new Resource(resourceBody);
        await resource.save();
        
        res.status(201).json(resource);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const deleted = await Resource.findOneAndDelete({
            _id: req.params.id,
            organisationId: user.organisationId
        });

        if (!deleted) {
            return res.status(403).json({
                success: false,
                message: 'The Resource was not deleted correctly.',
            });
        }
        res.status(200).json({
            success: true,
            message: 'Resource deleted successfully',
            resourceId: deleted._id
        })
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;