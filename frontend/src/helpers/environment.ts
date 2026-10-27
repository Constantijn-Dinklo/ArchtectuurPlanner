// The environment the user works in is remembered in the browser, so it stays selected after a reload.
// It is sent with every request (see axios.ts), the backend checks the user has access to it.

const STORAGE_KEY = 'architectuurPlanner.environmentId';

export function getStoredEnvironmentId(): string | null {
    try {
        return localStorage.getItem(STORAGE_KEY);
    }
    catch {
        return null;
    }
}

export function setStoredEnvironmentId(environmentId: string) {
    try {
        localStorage.setItem(STORAGE_KEY, environmentId);
    }
    catch {
        // Without storage the selection only lasts until the page is reloaded
    }
}
