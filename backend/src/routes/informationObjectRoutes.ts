import express, { Router, Response } from "express";

import { AuthenticatedRequest, getUser } from "../middelware";
import InformationObject from "../models/information/informationObject.models";
import { addInformationFieldToInformationObject, deleteInformationFieldFromInformationObject } from "../services/resourceObject.service";
import { moveApplicationInformationFieldToInformationObject, moveInformationFieldFromInformationObjectToApplication } from "../services/application.service";
import { cleanupApisForInformationObject, cleanupApplicationApis } from "../services/api.service";
import { setInformationObjectSource } from "../services/informationSource.service";
import { deleteInformation, getInformationUsage } from "../services/informationUsage.service";

const router: Router = express.Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        res.json(await InformationObject.find({ environmentId: user.environmentId }));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/:id/informationFields', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const { informationField, fromApplication } = req.body;
        const result = await addInformationFieldToInformationObject(user, req.params.id as string, informationField);

        // The field was moved out of the standalone list of an application
        if(fromApplication && "informationFieldId" in informationField){
            const application = await moveApplicationInformationFieldToInformationObject(
                user,
                fromApplication.applicationId,
                informationField.informationFieldId,
                fromApplication.direction
            );
            // An api of the application keeps sending the field when it moved into an output object,
            // but not when it moved into an input object
            await cleanupApplicationApis(user, fromApplication.applicationId);
            return res.status(201).json({ ...result, application });
        }
        res.status(201).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id/informationFields/:informationFieldId', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const informationFieldId = req.params.informationFieldId as string;
        const { applicationId, direction } = req.query;
        const result = await deleteInformationFieldFromInformationObject(user, req.params.id as string, informationFieldId);

        // The field is moved back to the standalone list of an application
        if(applicationId){
            const application = await moveInformationFieldFromInformationObjectToApplication(
                user,
                applicationId as string,
                informationFieldId,
                direction === 'output' ? 'output' : 'input'
            );
            await cleanupApisForInformationObject(user, req.params.id as string);
            return res.status(200).json({ ...result, application });
        }
        // Applications that output this object can no longer send the field, unless they still have it some other way
        await cleanupApisForInformationObject(user, req.params.id as string);
        res.status(200).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

// What still uses the object: it can only be deleted when nothing does
router.get('/:id/usage', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json({ usage: await getInformationUsage(getUser(req), 'object', req.params.id as string) });
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await deleteInformation(getUser(req), 'object', req.params.id as string));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Sets the source of the object: the resource it originates from. { resourceId: null } removes the source
router.patch('/:id/source', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const informationObject = await setInformationObjectSource(user, req.params.id as string, req.body.resourceId ?? null);
        res.json(informationObject);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
