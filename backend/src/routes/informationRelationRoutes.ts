import express, { Router, Response } from "express";

import { AuthenticatedRequest, authenticateToken, getUser } from "../middelware";
import ResourceFieldRelation from "../models/information/resourceFieldRelation.model";
import ResourceObjectRelation from "../models/information/resourceObjectRelation.model";

const router: Router = express.Router();

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const fieldRelations = await ResourceFieldRelation.find({
            organisationId: user.organisationId
        });
        const objectRelations = await ResourceObjectRelation.find({
            organisationId: user.organisationId
        });
        res.json({ fieldRelations, objectRelations });
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
