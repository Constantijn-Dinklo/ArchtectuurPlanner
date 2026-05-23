import api from "../helpers/axios";
import { useCanvasStore, type CanvasEdge } from "../stores/canvas.store";
import { useConnectionStore, type Connection } from "../stores/connection.store";


export function useConnectionService() {
    const connectionStore = useConnectionStore();
    const canvasStore = useCanvasStore();

    async function fetchConnections() {
        const res = await api.get('/connections');
        const data = res.data as Connection[];
        connectionStore.setConnections(data);

        data.map((conn) => {
            canvasStore.addEdge({
                id: conn.id,
                source: conn.sourceId,
                target: conn.targetId
            })
        })
    }

    async function updateConnection(id: string, patch: Partial<Connection>) {
        const updatedConnection = await connectionStore.updateConnection(id, patch);
        if(!updatedConnection) return;
        const updatedEdge: CanvasEdge = {
            id: updatedConnection.data.id,
            source: updatedConnection.data.sourceId,
            target: updatedConnection.data.targetId
        }
        canvasStore.updateEdge(id, updatedEdge);
    }

    return { fetchConnections, updateConnection }
}