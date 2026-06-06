import express, { Router, Request, Response } from "express";
import Organisation, { IOrganisation } from "../models/organisatie.model";

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

export default router;