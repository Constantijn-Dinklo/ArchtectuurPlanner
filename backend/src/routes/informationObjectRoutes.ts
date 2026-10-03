import express, { Router, Response } from "express";

import { AuthenticatedRequest, authenticateToken, getUser } from "../middelware";
import { addInformationFieldToInformationObject, deleteInformationFieldFromInformationObject } from "../services/resourceObject.service";
import { moveApplicationInformationFieldToInformationObject, moveInformationFieldFromInformationObjectToApplication } from "../services/application.service";
import { cleanupApisForInformationObject, cleanupApplicationApis } from "../services/api.service";

const router: Router = express.Router();

router.post('/:id/informationFields', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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

router.delete('/:id/informationFields/:informationFieldId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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

export default router;
