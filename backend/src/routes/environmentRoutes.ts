import express, { Router, Response } from "express";
import { AuthenticatedRequest, authenticateToken, getUser } from "../middelware";
import {
    addEnvironmentMember,
    createEnvironment,
    getAccessibleEnvironments,
    getEnvironmentMembers,
    removeEnvironmentMember
} from "../services/environment.service";

// Environments are chosen before working in one, so these routes do not need an X-Environment-Id header
const router: Router = express.Router();

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await getAccessibleEnvironments(getUser(req)));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = getUser(req);
        await createEnvironment(user, req.body.name);
        res.status(201).json(await getAccessibleEnvironments(user));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/:id/members', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await getEnvironmentMembers(getUser(req), req.params.id as string));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/:id/members', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.status(201).json(await addEnvironmentMember(getUser(req), req.params.id as string, req.body.email));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id/members/:memberId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(await removeEnvironmentMember(getUser(req), req.params.id as string, req.params.memberId as string));
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
