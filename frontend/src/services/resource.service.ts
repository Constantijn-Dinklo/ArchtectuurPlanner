import api from "../helpers/axios";

import { useResourceStore, type Resource, type ResourceType } from "../stores/resource.store";
import { useCanvasStore } from "../stores/canvas/canvas.store";
import { useViewStore } from "../stores/canvas/view.store";
import { computed } from "vue";

export function useResourceService() {
    const resourceStore = useResourceStore();
    const viewStore = useViewStore();
    const canvasStore = useCanvasStore();

    const resourceMap = computed(() => {
        const map = new Map<string, Resource>();

        for(const r of resourceStore.resources) {
            map.set(r.id, r);
        }
        return map;
    })

    async function fetchResources() {
        const res = await api.get('/resources');
        const data = res.data as Resource[];
        resourceStore.setResources(data);
    }

    async function createResource(name: string, type: ResourceType) {
        const newResourceId = await resourceStore.createResource(name, type);
        await viewStore.createViewNode(newResourceId);
    }

    async function removeResource(resourceId: string) {
        const deletedResourceID = await resourceStore.deleteResource(resourceId);
        canvasStore.removeNode(deletedResourceID);
    }

    function getResource(id: string): Resource | undefined {
        return resourceMap.value.get(id);
    }

    function getByType(type: ResourceType){
        return resourceStore.resources.filter(resource => resource.type === type);
    }

    return { fetchResources, createResource, removeResource, getResource, getByType }
}