import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../helpers/axios';
import { useToast } from 'primevue';

export type ResourceType = 'application' | 'database';

export interface Resource {
    id: string;
    name: string;
    type: ResourceType
}

export const useResourceStore = defineStore('resource', () => {
    const resources = ref<Resource[]>([]);

    const toast = useToast();
    

    function setResources(apps: Resource[]) {
        resources.value = apps;
    }

    async function createResource(name: string, type: ResourceType) {
        const res = await api.post('/resources', {
            name: name,
            type: type
        })
        const newResource : Resource = {
            id: res.data.id,
            name: res.data.name,
            type: res.data.type
        }
        resources.value.push(newResource);
        return newResource.id;
    }

    async function deleteResource(id: string) {
        try {
            const res = await api.delete(`/resources/${id}`);
            resources.value = resources.value.filter((resource) => resource.id !== res.data.resourceId);
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

    return { resources, setResources, createResource, deleteResource }
});