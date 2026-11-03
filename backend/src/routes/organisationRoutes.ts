import express, { Router, Request, Response } from "express";
import Organisation, { IOrganisation } from "../models/organisatie.model";
import { AuthenticatedRequest, authenticateToken, getUser, requireOrganisationAdmin } from "../middelware";
import { deactivateUser, deleteUser, getOrganisationUsers, restoreUser, updateEnvironmentRole, updateOrganisationRole } from "../services/organisation.service";

const router: Router = express.Router();

router.post('/create', async (req: Request, res: Response) => {
    try {
        const org: IOrganisation = new Organisation({
            name: req.body.name
        })
        await org.save();

        res.json(org);
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/users', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await getOrganisationUsers(getUser(req)));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.patch('/users/:id/role', authenticateToken, requireOrganisationAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await updateOrganisationRole(getUser(req), req.params.id as string, req.body.organisationRole));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.patch('/users/:id/environments/:environmentId/role', authenticateToken, requireOrganisationAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await updateEnvironmentRole(getUser(req), req.params.id as string, req.params.environmentId as string, req.body.role));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Removing makes a user inactive; restoring brings it back; deleting an inactive user hides it for everyone
router.post('/users/:id/deactivate', authenticateToken, requireOrganisationAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await deactivateUser(getUser(req), req.params.id as string));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/users/:id/restore', authenticateToken, requireOrganisationAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await restoreUser(getUser(req), req.params.id as string));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/users/:id', authenticateToken, requireOrganisationAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await deleteUser(getUser(req), req.params.id as string));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
