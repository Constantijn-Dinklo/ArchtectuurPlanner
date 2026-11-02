import axios from 'axios';
import { getStoredEnvironmentId } from './environment';

const api = axios.create({
    // Set in VITE_API_URL. Only development can do without it: a build fails without it (see vite.config.ts)
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
    withCredentials: true,
    timeout: 5000,
});

// All architecture data belongs to an environment: every request says which environment it works in
api.interceptors.request.use((config) => {
    const environmentId = getStoredEnvironmentId();
    if (environmentId) {
        config.headers.set('X-Environment-Id', environmentId);
    }
    return config;
});

export default api;
