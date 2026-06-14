import express, { Router, Response } from "express";
import { AuthenticatedRequest, authenticateToken, getUser } from "../middelware";
import Resource from "../models/resource.model";
import ApiConnection from "../models/apiConnection.model";
import DatabaseConnection from "../models/databaseConnection.model";
import ViewNode from "../models/canvas/viewNode.model";

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
        const resource = await Resource.findOne({
            _id: req.params.id,
            organisationId: user.organisationId
        });

        if(resource && resource.type === 'application'){
            const apiConnections = await ApiConnection.find({
                organisationId: user.organisationId,
                $or: [ 
                    { sourceId: req.params.id },
                    { targetId: req.params.id }
                ]
            });
            if(apiConnections.length > 0){
                res.status(409).json({
                    success: false,
                    message: "Cannot delete Application because it is still being used",
                    dependencies: {
                        apiConnections: apiConnections.map(connection => {
                            id: connection._id
                        })
                    }
                });
                return;
            }
        }
        else if(resource && resource.type === 'database'){
            const databaseConnections = await DatabaseConnection.find({
                organisationId: user.organisationId,
                databaseId: req.params.id
            });
            if(databaseConnections.length > 0){
                res.status(409).json({
                    success: false,
                    message: "Cannot delete Database because it is still being used",
                    dependencies: {
                        databaseConnections: databaseConnections.map(connection => {
                            id: connection._id
                        })
                    }
                });
                return;
            }
        }

        const deletedNode = await ViewNode.findOneAndDelete({
            organisationId: user.organisationId,
            resourceId: req.params.id
        });

        const deleted = await Resource.findOneAndDelete({
            _id: req.params.id,
            organisationId: user.organisationId
        });

        if (!deleted || !deletedNode) {
            return res.status(403).json({
                success: false,
                message: 'The Resource was not deleted correctly.',
            });
        }
        res.status(200).json({
            success: true,
            message: 'Resource deleted successfully',
            resourceId: deleted._id,
            viewNodeId: deletedNode._id
        })
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;