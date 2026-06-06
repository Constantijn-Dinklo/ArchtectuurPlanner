import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../helpers/axios';

export type ResourceType = 'application' | 'database';

export interface Resource {
    id: string;
    name: string;
    type: ResourceType
}

export const useResourceStore = defineStore('resource', () => {
    const resources = ref<Resource[]>([]);

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

    async function deleteResource(id: string): Promise<string>{
        const res = await api.delete(`/resources/${id}`);
        resources.value = resources.value.filter((resource) => resource.id !== res.data.appId);
        return res.data.appId;
    }

    return { resources, setResources, createResource, deleteResource }
});