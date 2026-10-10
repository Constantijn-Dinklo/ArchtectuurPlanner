import { useViewStore } from "../../stores/canvas/view.store";
import { useDatabaseStore } from "../../stores/resources/database.store";
import { useTableStore, type Table } from "../../stores/resources/table.store";

export function useDatabaseService() {
    const databaseStore = useDatabaseStore();
    const viewStore = useViewStore();

    const tableStore = useTableStore();

    async function createDatabase(name: string) {
        const currentViewId = viewStore.currentViewId;
        const res = await databaseStore.createDatabase(name, currentViewId);
        viewStore.addViewNode(res.viewNode);
    }

    // The backend also deletes the tables of the database, so they are removed here as well
    async function deleteDatabase(databaseId: string) {
        const res = await databaseStore.deleteDatabase(databaseId);
        // Undefined when the database could not be deleted, for example because it is still used
        if (!res?.success) return;

        viewStore.removeViewNode(res.viewNodeId);
        for (const viewNodeId of res.deletedTableViewNodeIds ?? []) {
            viewStore.removeViewNode(viewNodeId);
        }
        tableStore.tables = tableStore.tables.filter(table => !(res.deletedTableIds ?? []).includes(table.id));
    }

    function getDatabaseTables(databaseId: string): Table[]{
        return tableStore.tables.filter((table) => table.databaseId === databaseId);
    }

    return { createDatabase, deleteDatabase, getDatabaseTables }
}