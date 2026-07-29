import { useViewStore } from "../../stores/canvas/view.store";
import { useTableStore } from "../../stores/resources/table.store";


export function useTableService() {
    const tableStore = useTableStore();
    const viewStore = useViewStore();

    async function createTable(name: string, databaseId: string) {
        const currentViewId = viewStore.currentViewId;
        const res = await tableStore.createTable(name, databaseId, currentViewId);
        viewStore.addViewNode(res.viewNode);
    }

    async function deleteTable(tableId: string) {
        const res = await tableStore.deleteTable(tableId);
        viewStore.removeViewNode(res.viewNodeId);
    }

    return { createTable, deleteTable }
}