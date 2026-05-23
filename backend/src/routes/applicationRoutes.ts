import express, { Router, Request, Response } from "express";
import Application from "../models/application.model";

const router: Router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        const applications = await Application.find();
        res.json(applications);
    }
    catch(err: any){
        res.status(400).json({ error: err.message });
    }
});

router.post('/', async (req: Request, res: Response) => {
    try {
        const applicationBody = {
            name: req.body.name
        }
        const application = new Application(applicationBody);
        await application.save();
        
        res.status(201).json({
            id: application._id,
            name: application.name
        });
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const deleted = await Application.findOneAndDelete({
            _id: req.params.id
        });

        if (!deleted) {
            return res.status(403).json({
                success: false,
                message: 'The Appliction was not deleted correctly.',
            });
        }
        res.status(200).json({
            success: true,
            message: 'Application deleted successfully',
            appId: deleted._id
        })
    }
    catch(err: any) {
        res.status(400).json({ error: err.message });
    }
})

export default router;