import { defineStore } from "pinia";
import { ref } from "vue";
import api from "../helpers/axios";

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
}

export const useConnectionStore = defineStore('connection', () => {
    const connections = ref<Connection[]>([]);

    function setConnections(connects: Connection[]) {
        connections.value = connects
    }

    async function createConnection(sourceId: string, targetId: string) {
        const res = await api.post('/connections', {
            sourceId,
            targetId
        });
        const newConnection: Connection = {
            id: res.data.id,
            sourceId: res.data.sourceId,
            targetId: res.data.targetId
        }

        connections.value.push(newConnection);
        return newConnection.id;
    }

    async function updateConnection(id: string, patch: Partial<Connection>) {
        const res = await api.patch(`/connections/${id}`, patch);
        const conn = connections.value.find(c => c.id === id);
        if(!conn) return;
        const result = Object.assign(conn, res);
        return result;
    }

    function deleteConnection(id: string){
        connections.value = connections.value.filter((conn) => conn.id !== id);
    }

    return { connections, setConnections, createConnection, updateConnection, deleteConnection }
})