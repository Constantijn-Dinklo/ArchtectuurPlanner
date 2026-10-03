import { defineStore } from "pinia";
import { ref } from "vue";
import api from "../helpers/axios";
import { useToast } from "primevue";


export interface Api {
    id: string;
    applicationId: string;
    url: string;
    hasAuthentication: boolean;
    // The output information of the application that is sent through this api
    informationFieldIds: string[];
    informationObjectIds: string[];
}

export const useApiStore = defineStore('api', () => {
    const apis = ref<Api[]>([]);

    const toast = useToast();

    async function fetchApis() {
        const res = await api.get('/apis');
        const data = res.data as Api[];
        
        apis.value = data;
    }

    async function commitApi(applicationId: string, url: string){
        if(!url) { return; }

        const res = await api.post('/apis', {
            url: url,
            applicationId: applicationId
        });
        apis.value.push(res.data);
    }

    async function updateApi(id: string, patch: Partial<Api>) {
        const res = await api.patch(`/apis/${id}`, patch);
        const apiUpdate = apis.value.find(a => a.id === id);
        if(!apiUpdate) return;
        const result: Api = Object.assign(apiUpdate, res.data);
        return result;
    }

    async function deleteApi(id: string) {
        try {
            const res = await api.delete(`/apis/${id}`);
            if(!res) return;
            apis.value = apis.value.filter((api) => api.id !== id);   
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

    function setApi(updated: Api) {
        const existing = apis.value.find(a => a.id === updated.id);
        if(existing) {
            Object.assign(existing, updated);
        }
    }

    async function addInformationField(apiId: string, informationFieldId: string) {
        const res = await api.post<Api>(`/apis/${apiId}/informationFields`, { informationFieldId });
        setApi(res.data);
    }

    async function removeInformationField(apiId: string, informationFieldId: string) {
        const res = await api.delete<Api>(`/apis/${apiId}/informationFields/${informationFieldId}`);
        setApi(res.data);
    }

    async function addInformationObject(apiId: string, informationObjectId: string) {
        const res = await api.post<Api>(`/apis/${apiId}/informationObjects`, { informationObjectId });
        setApi(res.data);
    }

    async function removeInformationObject(apiId: string, informationObjectId: string) {
        const res = await api.delete<Api>(`/apis/${apiId}/informationObjects/${informationObjectId}`);
        setApi(res.data);
    }

    function getApi(id: string): Api | undefined{
        return apis.value.find((api) => api.id === id);
    }

    function getApplicationApis(applicationId: string) {
        return apis.value.filter((api) => api.applicationId === applicationId);
    }

    return { apis, fetchApis, commitApi, updateApi, deleteApi, getApi, getApplicationApis, addInformationField, removeInformationField, addInformationObject, removeInformationObject }
})