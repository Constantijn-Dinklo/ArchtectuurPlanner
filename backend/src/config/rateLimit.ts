import rateLimit from 'express-rate-limit';

// Limits per IP address, so a script cannot try passwords endlessly.
// Behind a proxy (most hosting platforms) TRUST_PROXY must be set, or every user shares the proxy's address and limit

// Only failed logins count, so someone who logs in often is never blocked
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many failed login attempts, try again in 15 minutes' }
});

// The number of proxies in front of the backend, for example 1 behind the proxy of a hosting platform. Not set: no proxy
export function getTrustProxy() {
    const hops = Number(process.env.TRUST_PROXY);
    return Number.isInteger(hops) && hops > 0 ? hops : false;
}
