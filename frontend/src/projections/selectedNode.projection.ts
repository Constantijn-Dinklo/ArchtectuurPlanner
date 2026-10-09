import { computed } from "vue";
import { useUIStore } from "../stores/canvas/ui.store";
import { useViewStore } from "../stores/canvas/view.store";
import { useApiConnectionStore } from "../stores/apiConnection.store";
import { useDatabaseConnectionStore } from "../stores/databaseConnection.store";
import { useScriptStore } from "../stores/script.store";
import { useApiConnectionService } from "../services/apiConnection.service";
import { useDatabaseConnectionService } from "../services/databaseConnection.service";
import { useResourceService } from "../services/resources/resource.service";
import { useResourceResolver } from "../resolvers/resource.resolver";
import { useOtherConnectionStore } from "../stores/otherConnection.store";



export function useSelectedNodeProjection() {
    const UIStore = useUIStore();
    const viewStore = useViewStore();

    const resourceService = useResourceService();
    const resourceResolver = useResourceResolver();

    const apiConnectionStore = useApiConnectionStore();
    const scriptStore = useScriptStore();
    const databaseConnectionStore = useDatabaseConnectionStore();
    const otherConnectionStore = useOtherConnectionStore();

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

    function getResourceOtherConnections(resourceId: string) {
        return otherConnectionStore.otherConnections
            .filter((otherConnection) => otherConnection.sourceId === resourceId || otherConnection.targetId === resourceId)
            .map((otherConnection) => ({
                ...otherConnection,
                source: otherConnection.sourceId ? resourceService.getResource(otherConnection.sourceId) : undefined,
                target: otherConnection.targetId ? resourceService.getResource(otherConnection.targetId) : undefined
            }));
    }

    const nodeInfo = computed(() => {
        const selectedEntityId = getSelectedEntityId();
        if(!selectedEntityId) { return }

        const resource = resourceService.getResource(selectedEntityId);
        if(!resource) { return }
        const node = resourceResolver.resolveResource(resource);
        
        const apiConnections = getResourceApiConnections(selectedEntityId);
        const scripts = getResourceScripts(selectedEntityId)
        const databaseConnections = getResourceDatabaseConnections(selectedEntityId);
        const otherConnections = getResourceOtherConnections(selectedEntityId);

        return {
            node,
            connections: {
                apiConnections,
                scripts,
                databaseConnections,
                otherConnections
            }
        };
    });

    return { isNodeSelected, nodeInfo }
}