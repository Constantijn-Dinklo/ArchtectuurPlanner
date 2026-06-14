import express, { Router, Response } from "express";
import Api from "../models/api.model";
import { AuthenticatedRequest, authenticateToken, getUser } from "../middelware";
import ApiConnection from "../models/apiConnection.model";

const router: Router = express.Router();

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    
    try {
        const apis = await Api.find({
            organisationId: user.organisationId
        });
        res.json(apis);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    
    try {
        const apiBody = {
            organisationId: user.organisationId,
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

router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const apiConnections = await ApiConnection.find({
            organisationId: user.organisationId,
            sourceUrlId: req.params.id,
        });
        
        if(apiConnections.length > 0){
            res.status(409).json({
                success: false,
                message: "Cannot delete API because it is still being used",
                dependencies: {
                    apiConnections: apiConnections.map(connection => {
                        id: connection._id
                    })
                }
            });
            return;
        }

        const deleted = await Api.findOneAndDelete(
            {
                _id: req.params.id,
                organisationId: user.organisationId
            },
            { returnDocument: 'after'}
        );
        res.json(deleted);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;