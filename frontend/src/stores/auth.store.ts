import { defineStore } from "pinia";
import { ref } from "vue";
import api from "../helpers/axios";


interface Auth {
    email: string;
    isAuthenticated: boolean;
}

export const useAuthStore = defineStore('auth', () => {
    const auth = ref<Auth>({
        email: '',
        isAuthenticated: false
    });

    async function login(email: string, password: string) {
        const res = await api.post('/auth/login', {
            email,
            password
        });

        auth.value = {
            email: res.data.email,
            isAuthenticated: true
        }
    }

    async function logout() {
        await api.post('/auth/logout');
        auth.value.email = ''
        auth.value.isAuthenticated = false;
    }

    async function getProfile() {
        const res = await api.get('/auth/profile');
        auth.value.email = res.data.email;
        auth.value.isAuthenticated = true;
    }

    async function createOrg(name: string) {
        await api.post('/org/create', {
            name: name
        });
    }

    return { auth, login, logout, getProfile, createOrg }
})