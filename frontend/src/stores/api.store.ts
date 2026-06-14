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

    function createTempApi(applicationId: string) {
        apis.value.push({
            id: '-1',
            url: '',
            applicationId: applicationId
        })
    }

    async function commitTempApi(url: string){
        const apiToCommit = apis.value.find(api => api.id === '-1');
        if(!apiToCommit) return;

        //Remove the tempapi since the url is empty (user didn't fill in a url which is invalid)
        if(!url) {
            apis.value = apis.value.filter((api) => api.id !== '-1')
            return;
        }

        const res = await api.post('/apis', {
            url: url,
            applicationId: apiToCommit.applicationId
        });
        apiToCommit.id = res.data.id;
        apiToCommit.url = url;
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

    function getApplicationApis(applicationId: string) {
        return apis.value.filter((api) => api.applicationId === applicationId);
    }

    return { apis, fetchApis, createTempApi, commitTempApi, deleteApi, getApplicationApis  }
})