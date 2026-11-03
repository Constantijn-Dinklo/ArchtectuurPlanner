import express, { Router, Request, Response } from "express";
import bcrypt from 'bcrypt';

import User, { ACTIVE_USER, IUser } from "../models/user.model";
import { AuthenticatedRequest, authenticateToken, getUser, requireOrganisationAdmin } from "../middelware";
import { loginLimiter } from "../config/rateLimit";
import { ACCESS_COOKIE_OPTIONS, setAccessCookie } from "../config/session";

const router: Router = express.Router();

// The app is not public: only an admin of an organisation can add a user, as a member of its own organisation.
// The admin stays logged in as itself, so no login cookie is set for the new user
router.post('/signup', authenticateToken, requireOrganisationAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const admin = getUser(req);
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if(!email) return res.status(400).json({ error: 'An e-mail address is required' });
    if(password.length < 8) return res.status(400).json({ error: 'The password needs at least 8 characters' });

    const user: IUser | null = await User.findOne({ email });
    if(user) return res.status(400).json({ error: 'User already exists' });

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const newUser: IUser = await new User({
            email,
            password: passwordHash,
            organisationId: admin.organisationId,
            organisationRole: 'member'
        }).save();

        res.status(201).json({ email: newUser.email });
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

    setAccessCookie(res, { id: user._id.toString(), username: user.email, organisationId: user.organisationId.toString() });

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