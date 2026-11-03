import { Response } from 'express';
import jwt from 'jsonwebtoken';

// A login lasts 4 hours. While the user is active it is renewed (see authenticateToken), so it only ends after
// 4 hours without any request. The token and the cookie have the same lifetime, so they always end together
const SESSION_DURATION_MS = 4 * 60 * 60 * 1000;
// A token is renewed at most once per this period, so not every request sends a new cookie
const REFRESH_AFTER_MS = 15 * 60 * 1000;

// Secure: the cookie only goes over https (browsers make an exception for localhost, so development keeps working).
// Logging out uses the same options: a browser can ignore clearing a cookie when they differ
export const ACCESS_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
} as const;

export interface SessionUser {
    id: string;
    username: string;
    organisationId: string;
}

export function setAccessCookie(res: Response, user: SessionUser) {
    const token = jwt.sign(
        { id: user.id, username: user.username, organisationId: user.organisationId },
        process.env.JWT_SECRET as string,
        { expiresIn: SESSION_DURATION_MS / 1000 }
    );
    res.cookie('accessToken', token, { ...ACCESS_COOKIE_OPTIONS, maxAge: SESSION_DURATION_MS });
}

// Whether a token was issued long enough ago to renew it. iat is in seconds
export function shouldRefreshSession(issuedAt: number | undefined) {
    return !issuedAt || Date.now() - issuedAt * 1000 > REFRESH_AFTER_MS;
}
