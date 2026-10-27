import { computed } from "vue";
import { useUIStore } from "../stores/canvas/ui.store";
import { useApiConnectionStore } from "../stores/apiConnection.store";
import { useScriptStore } from "../stores/script.store";
import { useViewStore } from "../stores/canvas/view.store";
import { useApiConnectionService } from "../services/apiConnection.service";
import { useDatabaseConnectionStore } from "../stores/databaseConnection.store";
import { useDatabaseConnectionService } from "../services/databaseConnection.service";
import { useOtherConnectionStore } from "../stores/otherConnection.store";
import { useResourceService } from "../services/resources/resource.service";
import { useComponentStore } from "../stores/resources/component.store";
import { useTableStore } from "../stores/resources/table.store";
import { useInformationTransferService } from "../services/informationTransfer.service";


export function useSelectedEdgeProjection() {
    const UIStore = useUIStore();

    const viewStore = useViewStore();
    
    const apiConnectionStore = useApiConnectionStore();
    const scriptStore = useScriptStore();
    const databaseConnectionStore = useDatabaseConnectionStore();
    const otherConnectionStore = useOtherConnectionStore();
    const resourceService = useResourceService();
    const componentStore = useComponentStore();
    const tableStore = useTableStore();
    const informationTransferService = useInformationTransferService();
    
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
        // Same direction as the canvas edges: read is database -> resource, write is resource -> database
        const databaseConnections = databaseConnectionStore.databaseConnections.filter((databaseConnection) => {
            const writes = databaseConnection.operation.includes('write');
            const reads = databaseConnection.operation.includes('read') || !writes;

            return (
                (reads && databaseConnection.databaseId === inputEntityId && databaseConnection.entityId === outputEntityId) ||
                (writes && databaseConnection.entityId === inputEntityId && databaseConnection.databaseId === outputEntityId)
            )
        });

        const resolvedDatabaseConnections = databaseConnections.map(
            (databaseConnection) => databaseConnectionService.resolveConnection(databaseConnection)
        );

        return resolvedDatabaseConnections;
    }

    function getSelectedEdgeOtherConnections(inputEntityId: string, outputEntityId: string) {
        return otherConnectionStore.otherConnections
            .filter((otherConnection) => otherConnection.sourceId === inputEntityId && otherConnection.targetId === outputEntityId)
            .map((otherConnection) => ({
                ...otherConnection,
                source: resourceService.getResource(inputEntityId),
                target: resourceService.getResource(outputEntityId)
            }));
    }

    // Script components on the edge: the edge goes to or from the script node itself (from the database level on),
    // or from something the script reads to something it writes (at the application level)
    function getSelectedEdgeComponentScripts(inputEntityId: string, outputEntityId: string) {
        const scriptOnEdge = [inputEntityId, outputEntityId]
            .map((entityId) => componentStore.getComponent(entityId))
            .find((component) => component?.kind === 'script');
        if (scriptOnEdge) return [scriptOnEdge.id];

        const inputIds = [inputEntityId, ...tableStore.getTables(inputEntityId).map((table) => table.id)];
        const outputIds = [outputEntityId, ...tableStore.getTables(outputEntityId).map((table) => table.id)];
        return componentStore.components
            .filter((component) =>
                component.kind === 'script' &&
                component.inputs.some((end) => inputIds.includes(end.resourceId) || end.componentId === inputEntityId) &&
                component.outputs.some((end) => outputIds.includes(end.resourceId) || end.componentId === outputEntityId)
            )
            .map((component) => component.id);
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
        const otherConnections = getSelectedEdgeOtherConnections(inputEntityId, outputEntityId);

        return {
            apiConnections,
            scripts,
            databaseConnections,
            otherConnections,
            warnings: informationTransferService.getConnectionWarnings(inputEntityId, outputEntityId),
            componentScriptIds: getSelectedEdgeComponentScripts(inputEntityId, outputEntityId),
            sourceId: inputEntityId,
            targetId: outputEntityId,
            sourceName: resourceService.getResource(inputEntityId)?.name ?? componentStore.getComponent(inputEntityId)?.name,
            targetName: resourceService.getResource(outputEntityId)?.name ?? componentStore.getComponent(outputEntityId)?.name
        }
    });

    return { isEdgeSelected, connectionsInfo }
}