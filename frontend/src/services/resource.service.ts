import api from "../helpers/axios";

import { useResourceStore, type Resource, type ResourceType } from "../stores/resource.store";
import { useViewStore } from "../stores/canvas/view.store";
import { computed } from "vue";

export function useResourceService() {
    const resourceStore = useResourceStore();
    const viewStore = useViewStore();

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
        const currentViewId = viewStore.currentViewId;
        const res = await resourceStore.createResource(name, type, currentViewId);
        viewStore.addViewNode(res.viewNode);
    }

    async function removeResource(resourceId: string) {
        const res = await resourceStore.deleteResource(resourceId);
        viewStore.removeViewNode(res.viewNodeId);
    }

    function getResource(id: string): Resource | undefined {
        return resourceMap.value.get(id);
    }

    function getByType(type: ResourceType | ResourceType[]){
        const types = Array.isArray(type) ? type : [type];

        return resourceStore.resources.filter(resource =>
            types.includes(resource.type)
        );
    }

    return { fetchResources, createResource, removeResource, getResource, getByType }
}