import { defineStore } from "pinia";
import { ref } from "vue";
import api from "../helpers/axios";

export type DatabaseOperation = 'read' | 'write';

export interface DatabaseConnection {
    id: string;

    databaseId: string;
    entityId: string;

    operation: DatabaseOperation[];
}

export const useDatabaseConnectionStore = defineStore('databaseConnection', () => {
    const databaseConnections = ref<DatabaseConnection[]>([]);

    async function fetchDatabaseConnections() {
        const res = await api.get('/databaseConnections');
        const data = res.data as DatabaseConnection[];
        databaseConnections.value = data;
    }

    async function createDatabaseConnection(databaseId: string, entityId: string) {
        const res = await api.post('/databaseConnections', {
            databaseId,
            entityId
        });
        console.log(res);
        const newDatabaseConnection: DatabaseConnection = {
            id: res.data.id,
            databaseId: res.data.databaseId,
            entityId: res.data.entityId,
            operation: res.data.operation
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

    return { databaseConnections, fetchDatabaseConnections, createDatabaseConnection, updateDatabaseConnection, deleteDatabaseConnection }
})