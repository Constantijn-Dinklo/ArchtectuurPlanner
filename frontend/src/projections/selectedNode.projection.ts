import { computed } from "vue";
import { useUIStore } from "../stores/canvas/ui.store";
import { useViewStore } from "../stores/canvas/view.store";
import { useConnectionStore } from "../stores/connection.store";
import { useResourceService } from "../services/resources/resource.service";
import { useResourceResolver } from "../resolvers/resource.resolver";



export function useSelectedNodeProjection() {
    const UIStore = useUIStore();
    const viewStore = useViewStore();

    const resourceService = useResourceService();
    const resourceResolver = useResourceResolver();
    const connectionStore = useConnectionStore();

    function isNodeSelected() {
        return UIStore.selectedEntityType === 'node'
    }

    function getSelectedEntityId() {
        if(UIStore.selectedEntityType !== 'node') { return }
        const viewNode = viewStore.viewNodes.find(viewNode => viewNode.id === UIStore.selectedEntityId);
        if(!viewNode) { return }

        return viewNode.entityId;
    }

    const nodeInfo = computed(() => {
        const selectedEntityId = getSelectedEntityId();
        if(!selectedEntityId) { return }

        const resource = resourceService.getResource(selectedEntityId);
        if(!resource) { return }
        const node = resourceResolver.resolveResource(resource);

        return {
            node,
            // The connections of the resource, in either direction
            connections: connectionStore.getPartConnections(selectedEntityId)
        };
    });

    return { isNodeSelected, nodeInfo }
}
