import api from "../helpers/axios";
import { useDatabaseConnectionStore, type DatabaseConnection } from "../stores/databaseConnection.store";


export function useDatabaseConnectionService() {
    const databaseConnectionStore = useDatabaseConnectionStore();

    async function fetchDatabaseConnections() {
        const res = await api.get('/databaseConnections');
        const data = res.data as DatabaseConnection[];
        databaseConnectionStore.setDatabaseConnections(data);
    }

    async function updateDatabaseConnection(id: string, patch: Partial<DatabaseConnection>) {
        const updatedConnection = await databaseConnectionStore.updateDatabaseConnection(id, patch);
    }

    return { fetchDatabaseConnections, updateDatabaseConnection }
}