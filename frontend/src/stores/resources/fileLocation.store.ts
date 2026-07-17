import { defineStore } from "pinia";
import { ref } from "vue";
import { useToast } from 'primevue';

import api from "../../helpers/axios";

export interface FileLocation {
    id: string;
    name: string;
    type: 'fileLocation';
}

export const useFileLocationStore = defineStore('fileLocations', () => {
    const fileLocations = ref<FileLocation[]>([]);

    const toast = useToast();

    async function  fetchFileLocations() {
        const res = await api.get('/fileLocations');
        const data = res.data as FileLocation[];

        fileLocations.value = data.map((d) => ({ 
            ...d,
            type: 'fileLocation'
        }));;
    }

    async function createFileLocation(name: string, viewId: string) {
        const res = await api.post('/fileLocations', {
            name: name,
            viewId: viewId
        });
        const newFileLocation: FileLocation = {
            id: res.data.fileLocation.id,
            name: res.data.fileLocation.name,
            type: 'fileLocation'
        }
        fileLocations.value.push(newFileLocation);
        return res.data;
    }

    async function deleteFileLocation(id: string) {
        try {
            const res = await api.delete(`/fileLocations/${id}`);
            fileLocations.value = fileLocations.value.filter((fileLocation) => fileLocation.id !== res.data.resourceId);
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
    

    return { fileLocations, fetchFileLocations, createFileLocation, deleteFileLocation }
})