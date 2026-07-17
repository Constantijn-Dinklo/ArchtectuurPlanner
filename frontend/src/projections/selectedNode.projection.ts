import { computed } from "vue";
import { useUIStore } from "../stores/canvas/ui.store";
import { useViewStore } from "../stores/canvas/view.store";
import { useApiConnectionStore } from "../stores/apiConnection.store";
import { useDatabaseConnectionStore } from "../stores/databaseConnection.store";
import { useScriptStore } from "../stores/script.store";
import { useApiConnectionService } from "../services/apiConnection.service";
import { useDatabaseConnectionService } from "../services/databaseConnection.service";
import { useResourceService } from "../services/resources/resource.service";



export function useSelectedNodeProjection() {
    const UIStore = useUIStore();
    const viewStore = useViewStore();

    const resourceService = useResourceService();

    const apiConnectionStore = useApiConnectionStore();
    const scriptStore = useScriptStore();
    const databaseConnectionStore = useDatabaseConnectionStore();

    const apiConnectionService = useApiConnectionService();
    const databaseConnectionService = useDatabaseConnectionService();

    function isNodeSelected() {
        return UIStore.selectedEntityType === 'node'
    }
    
    function getSelectedEntityId() {
        if(UIStore.selectedEntityType !== 'node') { return }
        const viewNode = viewStore.viewNodes.find(viewNode => viewNode.id === UIStore.selectedEntityId);
        if(!viewNode) { return }

        return viewNode.entityId;
    }

    function getResourceApiConnections(resourceId: string) {
        const apiConnections = apiConnectionStore.apiConnections.filter((apiConnection) => {
            return (
                apiConnection.sourceId === resourceId || 
                apiConnection.targetId === resourceId
            )
        });

        const resolvedApiConnections = apiConnections.map(
            (apiConnection) => apiConnectionService.resolveConnection(apiConnection)
        );

        return resolvedApiConnections;
    }

    function getResourceScripts(resourceId: string) {
        const scripts = scriptStore.scripts.filter((script) => {
            return (
                script.inputIds.includes(resourceId) ||
                script.outputIds.includes(resourceId)
            )
        });
        
        return scripts;
    }

    function getResourceDatabaseConnections(resourceId: string) {
        const databaseConnections = databaseConnectionStore.databaseConnections.filter((databaseConnection) => {
            return (
                databaseConnection.databaseId === resourceId ||
                databaseConnection.entityId === resourceId
            )
        });

        const resolvedDatabaseConnections = databaseConnections.map(
            (databaseConnection) => databaseConnectionService.resolveConnection(databaseConnection)
        );

        return resolvedDatabaseConnections;
    }

    const nodeInfo = computed(() => {
        const selectedEntityId = getSelectedEntityId();
        if(!selectedEntityId) { return }

        const node = resourceService.getResource(selectedEntityId);
        if(!node) { return }
        
        const apiConnections = getResourceApiConnections(selectedEntityId);
        const scripts = getResourceScripts(selectedEntityId)
        const databaseConnections = getResourceDatabaseConnections(selectedEntityId);

        return {
            node,
            connections: {
                apiConnections,
                scripts,
                databaseConnections
            }
        };
    });

    return { isNodeSelected, nodeInfo }
}