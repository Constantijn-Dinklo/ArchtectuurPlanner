import { computed } from "vue";
import { useUIStore } from "../stores/canvas/ui.store";
import { useApiConnectionStore } from "../stores/apiConnection.store";
import { useScriptStore } from "../stores/script.store";
import { useViewStore } from "../stores/canvas/view.store";
import { useApiConnectionService } from "../services/apiConnection.service";
import { useDatabaseConnectionStore } from "../stores/databaseConnection.store";
import { useDatabaseConnectionService } from "../services/databaseConnection.service";


export function useSelectedEdgeProjection() {
    const UIStore = useUIStore();

    const viewStore = useViewStore();
    
    const apiConnectionStore = useApiConnectionStore();
    const scriptStore = useScriptStore();
    const databaseConnectionStore = useDatabaseConnectionStore();
    
    const apiConnectionService = useApiConnectionService();
    const databaseConnectionService = useDatabaseConnectionService();

    function isEdgeSelected() {
        return UIStore.selectedEntityType === 'edge'
    }
    
    function getSelectedEdgeId(){
        if(UIStore.selectedEntityType !== 'edge') { return }
        return UIStore.selectedEntityId;
    }

    function getSelectedEdgeEntityIds(selectedEdgeId: string) {
        const viewNodeIds = selectedEdgeId.split("-");
        if(viewNodeIds.length !== 2) { return undefined; }
        const inputViewNodeId = viewNodeIds[0];
        const outputViewNodeId = viewNodeIds[1];

        const inputViewNode = viewStore.viewNodes.find(viewNode => viewNode.id === inputViewNodeId);
        const outputViewNode = viewStore.viewNodes.find(viewNode => viewNode.id === outputViewNodeId);

        if(!inputViewNode || !outputViewNode) { return undefined; }

        const inputEntityId = inputViewNode.entityId;
        const outputEntityId = outputViewNode.entityId;

        return {
            inputEntityId,
            outputEntityId,
        }
    }

    function getSelectedEdgeApiConnections(inputEntityId: string, outputEntityId: string) {
        const apiConnections = apiConnectionStore.apiConnections.filter((apiConnection) => {
            return (
                apiConnection.sourceId === inputEntityId && 
                apiConnection.targetId === outputEntityId
            )
        });

        const resolvedApiConnections = apiConnections.map(
            (apiConnection) => apiConnectionService.resolveConnection(apiConnection)
        );

        return resolvedApiConnections;
    }

    function getSelectedEdgeScripts(inputEntityId: string, outputEntityId: string) {
        const scripts = scriptStore.scripts.filter((script) => {
            return (
                script.inputIds.includes(inputEntityId) &&
                script.outputIds.includes(outputEntityId)
            )
        });
        
        return scripts;
    }

    function getSelectedEdgeDB(inputEntityId: string, outputEntityId: string) {
        const databaseConnections = databaseConnectionStore.databaseConnections.filter((databaseConnection) => {
            return (
                databaseConnection.databaseId === inputEntityId &&
                databaseConnection.targetId === outputEntityId
            )
        });

        const resolvedDatabaseConnections = databaseConnections.map(
            (databaseConnection) => databaseConnectionService.resolveConnection(databaseConnection)
        );

        return resolvedDatabaseConnections;
    }

    const connectionsInfo = computed(() => {
        const selectedEdgeId = getSelectedEdgeId();
        if(!selectedEdgeId) { return }

        const entityIds = getSelectedEdgeEntityIds(selectedEdgeId);
        if(!entityIds) { return }
        const inputEntityId = entityIds.inputEntityId;
        const outputEntityId = entityIds.outputEntityId;


        const apiConnections = getSelectedEdgeApiConnections(inputEntityId, outputEntityId);
        const scripts = getSelectedEdgeScripts(inputEntityId, outputEntityId);
        const databaseConnections = getSelectedEdgeDB(inputEntityId, outputEntityId);

        return {
            apiConnections,
            scripts,
            databaseConnections
        }
    });

    return { isEdgeSelected, connectionsInfo }
}