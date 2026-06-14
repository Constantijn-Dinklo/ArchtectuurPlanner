import api from "../helpers/axios";
import { useApiConnectionStore, type ApiConnection } from "../stores/apiConnection.store";
import { label } from "@primeuix/themes/aura/metergroup";


export function useApiConnectionService() {
    const apiConnectionStore = useApiConnectionStore();

    async function fetchApiConnections() {
        const res = await api.get('/apiConnections');
        const data = res.data as ApiConnection[];
        apiConnectionStore.setApiConnections(data);
    }

    async function updateApiConnection(id: string, patch: Partial<ApiConnection>) {
        const updatedConnection = await apiConnectionStore.updateApiConnection(id, patch);
    }

    async function deleteApiConnection(id: string) {
        const deletedApiConnection = await apiConnectionStore.deleteApiConnection(id);
        if(!deletedApiConnection) return;
    }

    return { fetchApiConnections, updateApiConnection, deleteApiConnection }
}