import { useTableStore } from "../../stores/resources/table.store";


export function useTableService() {
    const tableStore = useTableStore();

    // A table is a component of its database: it gets its node on the canvas like any component
    async function createTable(name: string, databaseId: string) {
        return tableStore.createTable(name, databaseId);
    }

    async function renameTable(tableId: string, name: string) {
        await tableStore.renameTable(tableId, name);
    }

    // Scripts that used the table stay connected to its database
    async function deleteTable(tableId: string) {
        await tableStore.deleteTable(tableId);
    }

    return { createTable, renameTable, deleteTable }
}