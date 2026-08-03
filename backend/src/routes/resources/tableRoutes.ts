import express, { Router, Response } from "express";

import Table from "../../models/resources/table.model";
import { AuthenticatedRequest, authenticateToken, getUser } from "../../middelware";
import { createTable } from "../../services/table.service";
import ViewNode from "../../models/canvas/viewNode.model";
import InformationField from "../../models/informationField.model";

const router: Router = express.Router();

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    
    try {
        const tables = await Table.find({
            organisationId: user.organisationId
        }).populate('columns');
        res.json(tables);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const result = await createTable(user, req.body.name, req.body.databaseId, req.body.viewId);
        res.status(201).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.patch('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    console.log(req.body);

    try {
        const updated = await Table.findOneAndUpdate(
            {
                _id: req.params.id,
                organisationId: user.organisationId
            },
            { $set: req.body },
            { returnDocument: 'after'}
        );
        res.json(updated)
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    
    try {
        const deleted = await Table.findOneAndDelete(
            {
                _id: req.params.id,
                organisationId: user.organisationId
            },
            { returnDocument: 'after' }
        );

        const deletedNode = await ViewNode.findOneAndDelete({
            organisationId: user.organisationId,
            entityId: req.params.id
        });

        if (!deleted || !deletedNode) {
            res.json({
                status: 403,
                success: false,
                message: 'The Table was not deleted correctly.',
            });
        }

        res.json({
            status: 200,
            success: true,
            message: 'Table deleted successfully',
            resourceId: deleted?._id,
            viewNodeId: deletedNode?._id
        });
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
})

router.post('/:id/column', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const newInformationField = await new InformationField({
            organisationId: user.organisationId,
            fieldName: req.body.fieldName
        });
        await newInformationField.save();

        await Table.findOneAndUpdate(
            {
                _id: req.body.tableId,
                organisationId: user.organisationId
            },
            {
                $push: {
                    columns: newInformationField._id
                }
            }
        );

        res.status(201).json(newInformationField);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;