import { computed } from "vue";
import { useResourceService } from "../services/resource.service";
import { useViewStore } from "../stores/canvas/view.store";


export function useCanvasProjection() {
    const viewStore = useViewStore();
    const { getResource } = useResourceService();

    const flowNodes = computed(() => {
        return viewStore.viewNodes.map(vn => {
            const resource = getResource(vn.resourceId);

            return {
                id: vn.id,
                position: vn.position,
                data: resource
                    ? { label: resource.name, type: resource.type }
                    : { label: 'Unknown', type: 'unknown' },
                class: resource?.type
            };
        });
    });

    return {
        flowNodes
    };
}