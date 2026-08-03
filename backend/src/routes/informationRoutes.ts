import express, { Router, Response } from "express";

import { AuthenticatedRequest, authenticateToken, getUser } from "../middelware";
import InformationField from "../models/informationField.model";
import { createInformationField } from "../services/information.service";

const router: Router = express.Router();

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    
    try {
        const informationFields = await InformationField.find({
            organisationId: user.organisationId
        });
        res.json(informationFields);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        //DOES NOTHING FOR NOW
        const result = await createInformationField(user, req.body.name);
        res.status(201).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;