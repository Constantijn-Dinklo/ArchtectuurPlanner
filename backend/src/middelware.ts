import { Request, Response, NextFunction} from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET as string;

export interface UserJwtPayload extends JwtPayload {
    id: string;
    username: string;
    organisationId: string;

}

export interface AuthenticatedRequest extends Request {
    user?: UserJwtPayload;
}

export function authenticateToken(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    const accessToken = req.cookies.accessToken;

    if(!accessToken) return res.sendStatus(401);

    try {
        const payload = jwt.verify(accessToken, SECRET) as UserJwtPayload;
        req.user = payload;
        next();
    }
    catch {
        return res.status(401).json({
            message: "Invalid token"
        })
    }
}

export function getUser(req: AuthenticatedRequest): UserJwtPayload {
    if(!req.user){
        throw new Error('User not authenticated');
    }

    return req.user;
}