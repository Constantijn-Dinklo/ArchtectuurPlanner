import express, { Router, Response } from "express";
import { AuthenticatedRequest, authenticateToken, getUser } from "../../middelware";
import Application from "../../models/resources/application.model";
import { createAppliction, deleteApplication, addApplicationInputInformationField, deleteApplicationInputInformationField, addApplicationOutputInformationField, deleteApplicationOutputInformationField, getApplications, addApplicationInputInformationObject, deleteApplicationInputInformationObject, addApplicationOutputInformationObject, deleteApplicationOutputInformationObject } from "../../services/application.service";


const router: Router = express.Router();

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const result = await getApplications(user);
        res.status(201).json(result);
    }
    catch(err: any){
        res.status(400).json({ error: err.message });
    }
});

router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const result = await createAppliction(user, req.body.name, req.body.viewId);
        res.status(201).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.patch('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const updatedApplication = await Application.findOneAndUpdate(
            {
                _id: req.params.id,
                organisationId: user.organisationId
            },
            { $set: req.body },
            { returnDocument: 'after'}
        );
        if(!updatedApplication) { return res.status(400).json({error: "Application not found"}) }
        res.status(201).json(updatedApplication);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const result = await deleteApplication(user, req.params.id as string);
        res.status(result.status).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/:id/informationFields', authenticateToken,  async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const { direction, informationField } = req.body;
        if(direction === 'input'){
            const result = await addApplicationInputInformationField(user, req.params.id as string, informationField);
            res.status(201).json(result);
        }
        else {
            const result = await addApplicationOutputInformationField(user, req.params.id as string, informationField);
            res.status(201).json(result);
        }
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.patch('/:id/informationFields', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const { direction, informationFieldId } = req.body;
        if(direction === 'input'){
            const result = await deleteApplicationInputInformationField(user, req.params.id as string, informationFieldId);
            res.status(201).json(result);
        }
        else {
            const result = await deleteApplicationOutputInformationField(user, req.params.id as string, informationFieldId)
            res.status(201).json(result);
        }

    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/:id/informationObjects', authenticateToken,  async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const { direction, informationObject } = req.body;
        if(direction === 'input'){
            const result = await addApplicationInputInformationObject(user, req.params.id as string, informationObject);
            res.status(201).json(result);
        }
        else {
            const result = await addApplicationOutputInformationObject(user, req.params.id as string, informationObject);
            res.status(201).json(result);
        }
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.patch('/:id/informationObjects', authenticateToken,  async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const { direction, informationObjectId } = req.body;
        if(direction === 'input'){
            const result = await deleteApplicationInputInformationObject(user, req.params.id as string, informationObjectId);
            res.status(201).json(result);
        }
        else {
            const result = await deleteApplicationOutputInformationObject(user, req.params.id as string, informationObjectId);
            res.status(201).json(result);
        }

    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;