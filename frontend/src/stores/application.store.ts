import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../helpers/axios';

export interface Application {
    id: string;
    name: string;
}

export const useApplicationStore = defineStore('application', () => {
    const applications = ref<Application[]>([]);

    function setApplications(apps: Application[]) {
        applications.value = apps;
    }

    async function createApplication(name: string) {
        const res = await api.post('/applications', {
            name: name
        })
        const newApplication : Application = {
            id: res.data.id,
            name: res.data.name
        }

        applications.value.push(newApplication);

        return newApplication.id;
    }

    async function deleteApplication(id: string): Promise<string>{
        const res = await api.delete(`/applications/${id}`);
        applications.value = applications.value.filter((application) => application.id !== res.data.appId);
        return res.data.appId;
    }

    return { applications, setApplications, createApplication, deleteApplication }
});