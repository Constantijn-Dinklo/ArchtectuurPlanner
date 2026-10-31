import express, { Router, Response } from "express";
import { AuthenticatedRequest, getUser } from "../middelware";
import {
    addComponentEnd,
    addComponentEndInformation,
    addComponentInformationField,
    addComponentInformationObject,
    createComponent,
    deleteComponent,
    getComponents,
    removeComponentConnection,
    removeComponentEnd,
    removeComponentEndInformation,
    removeComponentInformationField,
    removeComponentInformationObject,
    updateComponent
} from "../services/component.service";
import { InformationSlot } from "../models/component.model";

const router: Router = express.Router();

// Where the information goes: 'input' or 'output' for a script, 'contains' (or nothing) for a file
function getSlot(slot: unknown) {
    return typeof slot === 'string' ? slot as InformationSlot : undefined;
}

function getSide(side: string) {
    if(side !== 'inputs' && side !== 'outputs') throw new Error("Unknown side, use inputs or outputs");
    return side;
}

function getInformationType(type: string) {
    if(type === 'fields') return 'Field';
    if(type === 'objects') return 'Object';
    throw new Error("Unknown information, use fields or objects");
}

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await getComponents(getUser(req)));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.status(201).json(await createComponent(getUser(req), req.body));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await updateComponent(getUser(req), req.params.id as string, req.body));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await deleteComponent(getUser(req), req.params.id as string));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

// <-- What a script reads from (inputs) and writes to (outputs) -->
router.post('/:id/:side', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.status(201).json(await addComponentEnd(getUser(req), req.params.id as string, getSide(req.params.side as string), req.body));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id/:side/:index', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await removeComponentEnd(getUser(req), req.params.id as string, getSide(req.params.side as string), Number(req.params.index)));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

// The whole connection to a resource: the resource and every table or file of it
router.delete('/:id/:side/connection/:connectionId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await removeComponentConnection(getUser(req), req.params.id as string, getSide(req.params.side as string), req.params.connectionId as string));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

// <-- The information a script reads from one end or writes to one end -->
router.post('/:id/:side/:index/information/:type', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const type = getInformationType(req.params.type as string);
        res.status(201).json(await addComponentEndInformation(
            getUser(req), req.params.id as string, getSide(req.params.side as string), Number(req.params.index),
            type, type === 'Field' ? req.body.informationField : req.body.informationObject
        ));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id/:side/:index/information/:type/:informationId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await removeComponentEndInformation(
            getUser(req), req.params.id as string, getSide(req.params.side as string), Number(req.params.index),
            getInformationType(req.params.type as string), req.params.informationId as string
        ));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

// <-- The information a script takes in and produces, or a file contains -->
router.post('/:id/information/fields', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.status(201).json(await addComponentInformationField(getUser(req), req.params.id as string, req.body.informationField, getSlot(req.body.slot)));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id/information/fields/:informationFieldId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await removeComponentInformationField(getUser(req), req.params.id as string, req.params.informationFieldId as string, getSlot(req.query.slot)));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/:id/information/objects', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.status(201).json(await addComponentInformationObject(getUser(req), req.params.id as string, req.body.informationObject, getSlot(req.body.slot)));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id/information/objects/:informationObjectId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await removeComponentInformationObject(getUser(req), req.params.id as string, req.params.informationObjectId as string, getSlot(req.query.slot)));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
