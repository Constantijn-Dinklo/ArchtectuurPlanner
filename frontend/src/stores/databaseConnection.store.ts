import { defineStore } from "pinia";
import { ref } from "vue";
import api from "../helpers/axios";

export interface DatabaseConnection {
    id: string;

    databaseId: string;
    targetId: string;
}

export const useDatabaseConnectionStore = defineStore('databaseConnection', () => {
    const databaseConnections = ref<DatabaseConnection[]>([]);

    function setDatabaseConnections(connects: DatabaseConnection[]) {
        databaseConnections.value = connects;
    }

    async function createDatabaseConnection(databaseId: string, targetId: string) {
        const res = await api.post('/databaseConnections', {
            databaseId,
            targetId
        });
        const newDatabaseConnection: DatabaseConnection = {
            id: res.data.id,
            databaseId: res.data.databaseId,
            targetId: res.data.targetId
        }

        databaseConnections.value.push(newDatabaseConnection);
        return newDatabaseConnection.id;
    }

    async function updateDatabaseConnection(id: string, patch: Partial<DatabaseConnection>) {
        const res = await api.patch(`/databaseConnections/${id}`, patch);
        const conn = databaseConnections.value.find(c => c.id === id);
        if(!conn) return;
        const result: DatabaseConnection = Object.assign(conn, res.data);
        return result;
    }

    async function deleteDatabaseConnection(id: string) {
        const res = await api.delete(`/databaseConnections/${id}`);
        const data = res.data as DatabaseConnection;
        databaseConnections.value = databaseConnections.value.filter((conn) => conn.id !== id);
        return data;
    }

    return { databaseConnections, setDatabaseConnections, createDatabaseConnection, updateDatabaseConnection, deleteDatabaseConnection }
})