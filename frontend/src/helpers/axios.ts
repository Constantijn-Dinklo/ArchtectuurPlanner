import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3001',
    withCredentials: true,
    timeout: 5000,
});

export default api