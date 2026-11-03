import express, { Router, Request, Response } from "express";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import User, { ACTIVE_USER, IUser } from "../models/user.model";
import { AuthenticatedRequest, authenticateToken } from "../middelware";
import { loginLimiter, signupLimiter } from "../config/rateLimit";

const router: Router = express.Router();

const SECRET = process.env.JWT_SECRET as string;

// Secure: the cookie only goes over https (browsers make an exception for localhost, so development keeps working).
// Logging out uses the same options: a browser can ignore clearing a cookie when they differ
const ACCESS_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
} as const;

router.post('/signup', signupLimiter, async (req: Request, res: Response) => {

    const user: IUser | null = await User.findOne({email: req.body.email});
    if(user) return res.status(400).json({ message: 'User already exists'});

    try {
        const passwordHash = await bcrypt.hash(req.body.password, 10);
        const organisationId = '6a1fcd7562e012033bbccaf6';
        // The first user of an organisation becomes its admin, so every organisation has someone to manage it
        const isFirstUser = !(await User.exists({ organisationId, ...ACTIVE_USER }));
        const newUser: IUser = new User({
            email: req.body.email,
            password: passwordHash,
            organisationId,
            organisationRole: isFirstUser ? 'admin' : 'member'
        });
        const user: IUser = await newUser.save();

        const token = jwt.sign({id: user._id, username: user.email, organisationId: user.organisationId}, SECRET, { expiresIn: '24h'});
        const min = 60;
        res.cookie('accessToken', token, { ...ACCESS_COOKIE_OPTIONS, maxAge: 1000 * 60 * min });

        res.status(201).json({token: token, email: user.email});
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/login', loginLimiter, async (req: Request, res: Response) => {
    const { email, password } = req.body;
    // A removed (inactive or deleted) user cannot log in
    const user: IUser | null = await User.findOne({ email, ...ACTIVE_USER });

    if(!user || !user.password) return res.status(401).json({message: 'Invalid credentials'});

    const valid = await bcrypt.compare(password, user.password)
    if(!valid) return res.status(401).json({message: 'Invalid credentials'});

    const token = jwt.sign({id: user._id, username: user.email, organisationId: user.organisationId}, SECRET, {expiresIn: '24h'});

    const min = 60;
    res.cookie('accessToken', token, { ...ACCESS_COOKIE_OPTIONS, maxAge: 1000 * 60 * min });


    res.status(200).json({
        success: true
    });
});

router.post('/logout', async (_req: Request, res: Response) => {
    res.clearCookie('accessToken', ACCESS_COOKIE_OPTIONS);
    res.json({ message: 'Logged out' });
})

router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    if(!req.user) return res.status(400).json({ message: 'No user logged in'});
    const user: IUser | null = await User.findOne({ email: (req.user as any).username });
    if(!user) return res.status(400).json({ message: 'This user does not exist'});
    res.json({ message: 'User is logged in', email: user.email });
});

export default router;