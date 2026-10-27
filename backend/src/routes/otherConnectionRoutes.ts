import express, { Router, Response } from "express";
import { AuthenticatedRequest, getUser } from "../middelware";
import {
    addOtherConnectionInformationField,
    addOtherConnectionInformationObject,
    createOtherConnection,
    deleteOtherConnection,
    getOtherConnections,
    removeOtherConnectionInformationField,
    removeOtherConnectionInformationObject,
    updateOtherConnection
} from "../services/otherConnection.service";

const router: Router = express.Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await getOtherConnections(getUser(req)));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.status(201).json(await createOtherConnection(getUser(req), req.body));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await updateOtherConnection(getUser(req), req.params.id as string, req.body));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await deleteOtherConnection(getUser(req), req.params.id as string));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

// <-- Information carried over by the connection -->
router.post('/:id/informationFields', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.status(201).json(await addOtherConnectionInformationField(getUser(req), req.params.id as string, req.body.informationFieldId));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id/informationFields/:informationFieldId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await removeOtherConnectionInformationField(getUser(req), req.params.id as string, req.params.informationFieldId as string));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/:id/informationObjects', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.status(201).json(await addOtherConnectionInformationObject(getUser(req), req.params.id as string, req.body.informationObjectId));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id/informationObjects/:informationObjectId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await removeOtherConnectionInformationObject(getUser(req), req.params.id as string, req.params.informationObjectId as string));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
