import axios from 'axios';
import { getStoredEnvironmentId } from './environment';

const api = axios.create({
    baseURL: 'http://localhost:3001',
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
