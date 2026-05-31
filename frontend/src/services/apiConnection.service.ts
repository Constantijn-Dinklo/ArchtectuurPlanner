import api from "../helpers/axios";
import { useCanvasStore, type CanvasEdge } from "../stores/canvas.store";
import { useApiConnectionStore, type ApiConnection } from "../stores/apiConnection.store";


export function useApiConnectionService() {
    const apiConnectionStore = useApiConnectionStore();
    const canvasStore = useCanvasStore();

    async function fetchApiConnections() {
        const res = await api.get('/apiConnections');
        const data = res.data as ApiConnection[];
        apiConnectionStore.setApiConnections(data);

        data.map((conn) => {
            if(!conn.sourceId || !conn.targetId) return
            canvasStore.addApiEdge({
                id: conn.id,
                source: conn.sourceId,
                target: conn.targetId
            })
        })
    }

    async function updateApiConnection(id: string, patch: Partial<ApiConnection>) {
        const updatedConnection = await apiConnectionStore.updateApiConnection(id, patch);
        if(!updatedConnection) return;

        if(!updatedConnection.sourceId || !updatedConnection.targetId) return; //No need to create/update an edge if both endpoint are not known

        const updatedEdge: CanvasEdge = {
            id: updatedConnection.id,
            source: updatedConnection.sourceId,
            target: updatedConnection.targetId
        }
        canvasStore.updateApiEdge(id, updatedEdge);
    }

    async function deleteApiConnection(id: string) {
        const deletedApiConnection = await apiConnectionStore.deleteApiConnection(id);
        if(!deletedApiConnection) return;

        canvasStore.removeApiEdge(deletedApiConnection.id);
    }

    return { fetchApiConnections, updateApiConnection, deleteApiConnection }
}