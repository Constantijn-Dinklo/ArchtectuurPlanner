import { defineStore } from "pinia";
import { ref } from "vue";
import api from "../helpers/axios";
import { useToast } from "primevue";


export interface Api {
    id: string;
    applicationId: string;
    url: string;
    hasAuthentication: boolean;
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

    function getApi(id: string): Api | undefined{
        return apis.value.find((api) => api.id === id);
    }

    function getApplicationApis(applicationId: string) {
        return apis.value.filter((api) => api.applicationId === applicationId);
    }

    return { apis, fetchApis, commitApi, updateApi, deleteApi, getApi, getApplicationApis  }
})