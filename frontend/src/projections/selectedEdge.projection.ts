import { computed } from "vue";
import { useUIStore } from "../stores/canvas/ui.store";
import { useConnectionStore } from "../stores/connection.store";
import { useViewStore } from "../stores/canvas/view.store";
import { useResourceService } from "../services/resources/resource.service";
import { useComponentStore } from "../stores/resources/component.store";
import { useCanvasEndService } from "../services/canvasEnd.service";
import { useInformationTransferService } from "../services/informationTransfer.service";


export function useSelectedEdgeProjection() {
    const UIStore = useUIStore();

    const viewStore = useViewStore();
    
    const connectionStore = useConnectionStore();
    const resourceService = useResourceService();
    const componentStore = useComponentStore();
    const { getConnectionPieces } = useCanvasEndService();
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

    // The connections on the edge: those drawn between the two ends of the edge (a script or file at its resource while
    // components are hidden, a table at its database, a file while it is shown)
    function getSelectedEdgeConnections(inputEntityId: string, outputEntityId: string) {
        return connectionStore.connections.filter((connection) =>
            getConnectionPieces(connection).some((piece) => piece.sourceId === inputEntityId && piece.targetId === outputEntityId)
        );
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
            sourceId: inputEntityId,
            targetId: outputEntityId,
            sourceName: resourceService.getResource(inputEntityId)?.name ?? componentStore.getComponent(inputEntityId)?.name,
            targetName: resourceService.getResource(outputEntityId)?.name ?? componentStore.getComponent(outputEntityId)?.name
        }
    });

    return { isEdgeSelected, connectionsInfo }
}