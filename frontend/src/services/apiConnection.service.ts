import api from "../helpers/axios";
import { useApiStore } from "../stores/api.store";
import { useApiConnectionStore, type ApiConnection } from "../stores/apiConnection.store";
import { useResourceService } from "./resource.service";


export function useApiConnectionService() {
    const apiConnectionStore = useApiConnectionStore();
    const apiStore = useApiStore();
    const resourceService = useResourceService();

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

    function resolveConnection(connection: ApiConnection){
        const source = resourceService.getResource(connection.sourceId);
        const target = resourceService.getResource(connection.targetId);
        const api = apiStore.getApi(connection.sourceUrlId);
        return {
            ...connection,
            source,
            target,
            api
        }
    }

    return { fetchApiConnections, updateApiConnection, deleteApiConnection, resolveConnection }
}