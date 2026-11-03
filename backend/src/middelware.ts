import { Request, Response, NextFunction} from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { isValidObjectId } from 'mongoose';
import Environment from './models/environment.model';
import EnvironmentMember from './models/environmentMember.model';
import User, { ACTIVE_USER } from './models/user.model';

const SECRET = process.env.JWT_SECRET as string;

export interface UserJwtPayload extends JwtPayload {
    id: string;
    username: string;
    // The organisation the user belongs to
    organisationId: string;
    // The environment the request works in. Not part of the token: set by requireEnvironment for every request
    environmentId: string;
}

export interface AuthenticatedRequest extends Request {
    user?: UserJwtPayload;
}

export async function authenticateToken(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    // Already authenticated earlier in this request (app.ts authenticates before requireEnvironment, and the
    // routes authenticate again). Decoding the token again would replace req.user and lose its environmentId
    if(req.user) return next();

    const accessToken = req.cookies.accessToken;

    if(!accessToken) return res.sendStatus(401);

    let payload: UserJwtPayload;
    try {
        payload = jwt.verify(accessToken, SECRET) as UserJwtPayload;
    }
    catch {
        return res.status(401).json({
            message: "Invalid token"
        })
    }

    // A removed user is logged out at once, also while its token has not expired yet
    try {
        if(!(await User.exists({ _id: payload.id, ...ACTIVE_USER }))) {
            return res.status(401).json({ message: "This account is not active" });
        }
    }
    catch(err: any) {
        return res.status(400).json({ error: err.message });
    }

    req.user = payload;
    next();
}

// Whether the user may work in the environment: every user of the organisation that owns it,
// and every user that was added as a member (for example a consultant of another organisation)
export async function hasEnvironmentAccess(user: { id: string, organisationId: string }, environmentId: string) {
    if(!isValidObjectId(environmentId)) return false;

    const environment = await Environment.findById(environmentId);
    if(!environment) return false;
    if(environment.organisationId.toString() === user.organisationId?.toString()) return true;

    return !!(await EnvironmentMember.exists({ environmentId, userId: user.id }));
}

// Every request for architecture data works in one environment, given by the X-Environment-Id header.
// Use after authenticateToken. All data is then read and written with user.environmentId
export async function requireEnvironment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    const user = req.user;
    if(!user) return res.sendStatus(401);

    const environmentId = req.header('x-environment-id');
    if(!environmentId) {
        return res.status(400).json({ error: "No environment selected" });
    }

    try {
        if(!(await hasEnvironmentAccess(user, environmentId))) {
            return res.status(403).json({ error: "No access to this environment" });
        }
        user.environmentId = environmentId;
        next();
    }
    catch(err: any) {
        return res.status(400).json({ error: err.message });
    }
}

// Only admins of the organisation may manage its users. The role is read from the database, not the token,
// so a change takes effect at once. Use after authenticateToken
export async function requireOrganisationAdmin(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    const user = req.user;
    if(!user) return res.sendStatus(401);

    try {
        const account = await User.findById(user.id);
        if(account?.organisationRole !== 'admin') {
            return res.status(403).json({ error: "Only an admin of the organisation can do this" });
        }
        next();
    }
    catch(err: any) {
        return res.status(400).json({ error: err.message });
    }
}

export function getUser(req: AuthenticatedRequest): UserJwtPayload {
    if(!req.user){
        throw new Error('User not authenticated');
    }

    return req.user;
}
