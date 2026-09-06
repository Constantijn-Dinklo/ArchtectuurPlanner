import express, { Router, Response } from "express";
import { AuthenticatedRequest, authenticateToken, getUser } from "../../middelware";
import Application from "../../models/resources/application.model";
import { createAppliction, deleteApplication, addApplicationInputInformationField, deleteApplicationInputInformationField, resolveApplicationInformationFields, resolveApplicationsInformationFields, addApplicationOutputInformationField, deleteApplicationOutputInformationField } from "../../services/application.service";
import { IResourceFieldExpanded, resolveResourceField } from "../../models/resources/resourceField.model";


const router: Router = express.Router();

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const applications = await Application.find({
            organisationId: user.organisationId
        }).populate<{
            inputInformationFields: IResourceFieldExpanded[];
            outputInformationFields: IResourceFieldExpanded[];
        }>([
            {
                path: 'inputInformationFields.informationFieldId'
            },
            {
                path: 'outputInformationFields.informationFieldId'
            }
        ]);
        const resultApplications = resolveApplicationsInformationFields(applications);
        res.json(resultApplications);
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
        ).populate<{
            inputInformationFields: IResourceFieldExpanded[];
            outputInformationFields: IResourceFieldExpanded[];
        }>([
            {
                path: 'inputInformationFields.informationFieldId'
            },
            {
                path: 'outputInformationFields.informationFieldId'
            }
        ]);
        if(!updatedApplication) { return res.status(400).json({error: "Application not found"}) }
        const resultApplication = resolveApplicationInformationFields(updatedApplication);
        res.status(201).json(resultApplication);
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

export default router;