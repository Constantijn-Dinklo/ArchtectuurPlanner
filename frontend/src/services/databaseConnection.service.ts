import { useDatabaseConnectionStore, type DatabaseConnection } from "../stores/databaseConnection.store";
import { useResourceService } from "./resource.service";


export function useDatabaseConnectionService() {
    const databaseConnectionStore = useDatabaseConnectionStore();

    const resourceService = useResourceService();

    async function updateDatabaseConnection(id: string, patch: Partial<DatabaseConnection>) {
        const updatedConnection = await databaseConnectionStore.updateDatabaseConnection(id, patch);
    }

    async function deleteDatabaseConnection(id: string) {
        const deletedApiConnection = await databaseConnectionStore.deleteDatabaseConnection(id);
        if(!deletedApiConnection) return;
    }

    function resolveConnection(connection: DatabaseConnection) {
        const database = resourceService.getResource(connection.databaseId);
        const target = resourceService.getResource(connection.entityId);
        return {
            ...connection,
            database,
            target
        }
    }

    return { updateDatabaseConnection, deleteDatabaseConnection, resolveConnection }
}