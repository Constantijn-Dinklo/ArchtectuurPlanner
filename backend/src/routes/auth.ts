import express, { Router, Request, Response } from "express";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import User, { IUser } from "../models/user.model";
import { AuthenticatedRequest, authenticateToken } from "../middelware";

const router: Router = express.Router();

const SECRET = process.env.JWT_SECRET as string;

router.post('/signup', async (req: Request, res: Response) => {

    const user: IUser | null = await User.findOne({email: req.body.email});
    if(user) return res.status(400).json({ message: 'User already exists'});

    try {
        const passwordHash = await bcrypt.hash(req.body.password, 10);
        const newUser: IUser = new User({
            email: req.body.email,
            password: passwordHash,
            organisationId: '6a1fcd7562e012033bbccaf6'
        });
        const user: IUser = await newUser.save();

        const token = jwt.sign({id: user._id, username: user.email, organisationId: user.organisationId}, SECRET, { expiresIn: '24h'});
        const min = 60;
        res.cookie('accessToken', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 1000 * 60 * min 
        });

        res.status(201).json({token: token, email: user.email});
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const user: IUser | null = await User.findOne({ email });

    if(!user || !user.password) return res.status(401).json({message: 'Invalid credentials'});

    const valid = await bcrypt.compare(password, user.password)
    if(!valid) return res.status(401).json({message: 'Invalid credentials'});

    const token = jwt.sign({id: user._id, username: user.email, organisationId: user.organisationId}, SECRET, {expiresIn: '24h'});

    const min = 60;
    res.cookie('accessToken', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 1000 * 60 * min 
    });


    res.status(200).json({
        success: true
    });
});

router.post('/logout', async (_req: Request, res: Response) => {
    res.clearCookie('accessToken');
    res.json({ message: 'Logged out' });
})

router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    if(!req.user) return res.status(400).json({ message: 'No user logged in'});
    const user: IUser | null = await User.findOne({ email: (req.user as any).username });
    if(!user) return res.status(400).json({ message: 'This user does not exist'});
    res.json({ message: 'User is logged in', email: user.email });
});

export default router;