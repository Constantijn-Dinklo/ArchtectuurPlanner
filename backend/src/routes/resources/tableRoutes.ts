import { removeResourceRelations } from "../../services/externalRelation.service";
import express, { Router, Response } from "express";

import Table from "../../models/resources/table.model";
import { AuthenticatedRequest, getUser } from "../../middelware";
import { createTable, addTableColumn, removeTableColumn } from "../../services/table.service";
import ViewNode from "../../models/canvas/viewNode.model";
import { IResourceFieldExpanded, resolveResourceField } from "../../models/information/resourceField.model";

const router: Router = express.Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    
    try {
        const tables = await Table.find({
            environmentId: user.environmentId
        }).populate<{ columns: IResourceFieldExpanded[] }>('columns.informationFieldId');

        const result = tables.map(table => ({
            ...table.toJSON(),
            columns: table.columns.map(resolveResourceField)
        }));

        res.json(result);
    }
    catch(err: any) {
        console.log("Error");
        res.status(400).json({ error: err.message });
    }
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const result = await createTable(user, req.body.name, req.body.databaseId, req.body.viewId);
        res.status(201).json(result);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const updated = await Table.findOneAndUpdate(
            {
                _id: req.params.id,
                environmentId: user.environmentId
            },
            { $set: req.body },
            { returnDocument: 'after'}
        );
        res.json(updated);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    
    try {
        const deleted = await Table.findOneAndDelete(
            {
                _id: req.params.id,
                environmentId: user.environmentId
            },
            { returnDocument: 'after' }
        );

        const deletedNode = await ViewNode.findOneAndDelete({
            environmentId: user.environmentId,
            entityId: req.params.id
        });

        if (!deleted || !deletedNode) {
            return res.json({
                status: 403,
                success: false,
                message: 'The Table was not deleted correctly.',
            });
        }
        await removeResourceRelations(user, [req.params.id as string]);

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

router.post('/:id/columns', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const resultTable = await addTableColumn(user, req.body.tableId, req.body.informationField);
        res.status(201).json(resultTable);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.patch('/:id/columns', async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);

    try {
        const resultTable = await removeTableColumn(user, req.params.id as string, req.body.informationFieldId);
        res.status(201).json(resultTable);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;