import { computed } from "vue";
import { useUIStore } from "../stores/canvas/ui.store";
import { useConnectionStore } from "../stores/connection.store";
import { useViewStore } from "../stores/canvas/view.store";
import { useResourceService } from "../services/resources/resource.service";
import { useComponentStore } from "../stores/resources/component.store";
import { useTableStore } from "../stores/resources/table.store";
import { useInformationTransferService } from "../services/informationTransfer.service";


export function useSelectedEdgeProjection() {
    const UIStore = useUIStore();

    const viewStore = useViewStore();
    
    const connectionStore = useConnectionStore();
    const resourceService = useResourceService();
    const componentStore = useComponentStore();
    const tableStore = useTableStore();
    const informationTransferService = useInformationTransferService();

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

    // The connections on the edge. A connection to a table is drawn at its database while tables are hidden
    function getSelectedEdgeConnections(inputEntityId: string, outputEntityId: string) {
        const isShownAt = (partId: string, entityId: string) => {
            if (partId === entityId) return true;
            const resource = resourceService.getResource(partId);
            return resource?.type === 'table' && resource.databaseId === entityId;
        };
        return connectionStore.connections.filter((connection) =>
            isShownAt(connection.source.id, inputEntityId) && isShownAt(connection.target.id, outputEntityId)
        );
    }

    // Scripts on the edge: the edge goes to or from the script row itself (from the database level on),
    // or between what the script reads or writes and the resource the script runs in (at the application level)
    function getSelectedEdgeScripts(inputEntityId: string, outputEntityId: string) {
        const scriptOnEdge = [inputEntityId, outputEntityId]
            .map((entityId) => componentStore.getComponent(entityId))
            .find((component) => component?.kind === 'script');
        if (scriptOnEdge) return [scriptOnEdge.id];

        const inputIds = [inputEntityId, ...tableStore.getTables(inputEntityId).map((table) => table.id)];
        const outputIds = [outputEntityId, ...tableStore.getTables(outputEntityId).map((table) => table.id)];
        return componentStore.components
            .filter((component) =>
                component.kind === 'script' && (
                    (component.resourceId === outputEntityId &&
                        component.inputs.some((end) => inputIds.includes(end.resourceId) || end.componentId === inputEntityId)) ||
                    (component.resourceId === inputEntityId &&
                        component.outputs.some((end) => outputIds.includes(end.resourceId) || end.componentId === outputEntityId))
                )
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


        return {
            connections: getSelectedEdgeConnections(inputEntityId, outputEntityId),
            warnings: informationTransferService.getConnectionWarnings(inputEntityId, outputEntityId),
            scriptIds: getSelectedEdgeScripts(inputEntityId, outputEntityId),
            sourceId: inputEntityId,
            targetId: outputEntityId,
            sourceName: resourceService.getResource(inputEntityId)?.name ?? componentStore.getComponent(inputEntityId)?.name,
            targetName: resourceService.getResource(outputEntityId)?.name ?? componentStore.getComponent(outputEntityId)?.name
        }
    });

    return { isEdgeSelected, connectionsInfo }
}