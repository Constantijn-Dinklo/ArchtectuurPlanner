import { defineStore } from "pinia";
import { ref } from "vue";
import api from "../helpers/axios";
import { useToast } from "primevue";


export interface Api {
    id: string;
    url: string;
    applicationId: string;
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
        apis.value.push({
            id: res.data.id,
            url: res.data.url,
            applicationId: res.data.applicationId
        });

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

    return { apis, fetchApis, commitApi, deleteApi, getApi, getApplicationApis  }
})