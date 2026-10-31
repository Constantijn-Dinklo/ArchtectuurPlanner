import express, { Router, Response } from "express";

import { AuthenticatedRequest, authenticateToken, getUser } from "../middelware";
import InformationField from "../models/information/informationField.model";
import { createInformationField } from "../services/information.service";
import { setInformationFieldSource } from "../services/informationSource.service";
import { deleteInformation, getInformationUsage } from "../services/informationUsage.service";

const router: Router = express.Router();

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    
    try {
        const informationFields = await InformationField.find({
            environmentId: user.environmentId
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

// What still uses the field: it can only be deleted when nothing does
router.get('/:id/usage', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json({ usage: await getInformationUsage(getUser(req), 'field', req.params.id as string) });
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await deleteInformation(getUser(req), 'field', req.params.id as string));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Sets the source of the field: the resource it originates from. { resourceId: null } removes the source
router.patch('/:id/source', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const informationField = await setInformationFieldSource(user, req.params.id as string, req.body.resourceId ?? null);
        res.json(informationField);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;