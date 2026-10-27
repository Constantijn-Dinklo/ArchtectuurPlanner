import express, { Router, Response } from "express";
import { AuthenticatedRequest, getUser } from "../../middelware";
import {
    addProvidedInformationField,
    addProvidedInformationObject,
    createExternal,
    deleteExternal,
    getExternals,
    removeProvidedInformationField,
    removeProvidedInformationObject,
    updateExternal
} from "../../services/external.service";

const router: Router = express.Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await getExternals(getUser(req)));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await createExternal(getUser(req), req.body.name, req.body.viewId);
        res.status(201).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await updateExternal(getUser(req), req.params.id as string, req.body));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await deleteExternal(getUser(req), req.params.id as string));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

// <-- Information the external element provides -->
router.post('/:id/providedInformationFields', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.status(201).json(await addProvidedInformationField(getUser(req), req.params.id as string, req.body.informationField));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id/providedInformationFields/:informationFieldId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await removeProvidedInformationField(getUser(req), req.params.id as string, req.params.informationFieldId as string));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/:id/providedInformationObjects', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.status(201).json(await addProvidedInformationObject(getUser(req), req.params.id as string, req.body.informationObject));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id/providedInformationObjects/:informationObjectId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await removeProvidedInformationObject(getUser(req), req.params.id as string, req.params.informationObjectId as string));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
