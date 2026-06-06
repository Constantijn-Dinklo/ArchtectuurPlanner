import api from "../helpers/axios";
import { useCanvasStore, type CanvasEdge } from "../stores/canvas/canvas.store";
import { useDatabaseConnectionStore, type DatabaseConnection } from "../stores/databaseConnection.store";


export function useDatabaseConnectionService() {
    const databaseConnectionStore = useDatabaseConnectionStore();
    const canvasStore = useCanvasStore();

    async function fetchDatabaseConnections() {
        const res = await api.get('/databaseConnections');
        const data = res.data as DatabaseConnection[];
        databaseConnectionStore.setDatabaseConnections(data);

        data.map((conn) => {
            if(!conn.databaseId || !conn.targetId) return
            canvasStore.addDatabaseEdge({
                id: conn.id,
                source: conn.databaseId,
                target: conn.targetId
            })
        });
    }

    async function updateDatabaseConnection(id: string, patch: Partial<DatabaseConnection>) {
        const updatedConnection = await databaseConnectionStore.updateDatabaseConnection(id, patch);
        if(!updatedConnection) return;

        if(!updatedConnection.databaseId || !updatedConnection.targetId) return;

        const updatedEdge: CanvasEdge = {
            id: updatedConnection.id,
            source: updatedConnection.databaseId,
            target: updatedConnection.targetId
        }
        canvasStore.updateDatabaseEdge(id, updatedEdge);
    }

    return { fetchDatabaseConnections, updateDatabaseConnection }
}