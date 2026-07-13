import { defineStore } from "pinia";
import { ref } from "vue";
import { useToast } from 'primevue';

import api from "../helpers/axios";

export interface Application {
    id: string;
    name: string;
    type: 'application';
    version?: string;
}

export const useApplicationStore = defineStore('application', () => {
    const applications = ref<Application[]>([]);

    const toast = useToast();

    async function  fetchApplications() {
        const res = await api.get('/applications');
        const data = res.data as Application[];

        applications.value = data.map((d) => ({ 
            ...d,
            type: 'application'
        }));
    }

    async function createAppliction(name: string, viewId: string) {
        const res = await api.post('/applications', {
            name: name,
            viewId: viewId
        });
        const newApplication: Application = {
            id: res.data.application.id,
            name: res.data.application.name,
            type: 'application',
        }
        applications.value.push(newApplication);
        return res.data;
    }

    async function updateApplication(id: string, patch: Partial<Application>) {
        const res = await api.patch(`/applications/${id}`, patch);
        const application = applications.value.find(a => a.id === id);
        if(!application) return;
        const result: Application = Object.assign(application, res.data);
        return result; 
    }

    async function deleteApplication(id: string) {
        try {
            const res = await api.delete(`/applications/${id}`);
            applications.value = applications.value.filter((application) => application.id !== res.data.resourceId);
            return res.data;
        }
        catch(error: any) {
            if(error.response?.status === 409){
                toast.add({
                    severity: 'warn',
                    summary: error.response.data.message,
                    life: 3000
                })
            }
        }
    }

    return { applications, fetchApplications, createAppliction, updateApplication, deleteApplication }
})