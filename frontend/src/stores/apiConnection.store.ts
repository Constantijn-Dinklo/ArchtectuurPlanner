import { defineStore } from "pinia";
import { ref } from "vue";
import api from "../helpers/axios";

export interface ApiConnection {
  id: string;
  
  sourceId: string;
  sourceUrlId: string;
  targetId: string;
}

export const useApiConnectionStore = defineStore('apiConnection', () => {
    const apiConnections = ref<ApiConnection[]>([]);

    function setApiConnections(connects: ApiConnection[]) {
        apiConnections.value = connects
    }

    async function createApiConnection(sourceId: string, sourceUrlId: string, targetId: string, apiString: string) {
        const res = await api.post('/apiConnections', {
            sourceId,
            sourceUrlId,
            targetId,
        });
        const newApiConnection: ApiConnection = {
            id: res.data.id,
            sourceId: res.data.sourceId,
            sourceUrlId: res.data.sourceUrlId,
            targetId: res.data.targetId,
        }

        apiConnections.value.push(newApiConnection);
        return newApiConnection.id;
    }

    async function updateApiConnection(id: string, patch: Partial<ApiConnection>) {
        const res = await api.patch(`/apiConnections/${id}`, patch);
        const conn = apiConnections.value.find(c => c.id === id);
        if(!conn) return;
        const result: ApiConnection = Object.assign(conn, res.data);
        return result;
    }

    async function deleteApiConnection(id: string){
        const res = await api.delete(`/apiConnections/${id}`);
        const data = res.data as ApiConnection;
        apiConnections.value = apiConnections.value.filter((conn) => conn.id !== id);
        return data;
    }

    return { apiConnections, setApiConnections, createApiConnection, updateApiConnection, deleteApiConnection }
})