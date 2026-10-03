import { defineStore } from "pinia";
import { ref } from "vue";
import { useToast } from 'primevue';

import api from "../../helpers/axios";

import type { Application } from "../../types/application.types";
import { mapApplicationDto } from "../../mappers/application.mapper";

export const useApplicationStore = defineStore('application', () => {
    const applications = ref<Application[]>([]);

    const toast = useToast();

    function setApplications(data: Application[]) {
        applications.value = data.map(application => ({
            ...application,
            type: 'application'
        }));
    }

    function setApplication(app: Application) {
        const application = applications.value.find(a => a.id === app.id);
        if(!application) {
            applications.value.push({
                ...app,
                type: 'application'
            });
        }
        else {
            Object.assign(application, app);
        }
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
            inputInformationObjectRefs: [],
            outputInformationObjectRefs: [],
            inputInformationFieldRefs: [],
            outputInformationFieldRefs: []
        }
        applications.value.push(newApplication);
        return res.data;
    }

    async function updateApplication(id: string, patch: Partial<Application>) {
        const res = await api.patch(`/applications/${id}`, patch);
        const application = applications.value.find(a => a.id === id);
        if(!application) return;
        const result: Application = Object.assign(application, mapApplicationDto(res.data));
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

    return { applications, setApplications, setApplication, createAppliction, updateApplication, deleteApplication }
});