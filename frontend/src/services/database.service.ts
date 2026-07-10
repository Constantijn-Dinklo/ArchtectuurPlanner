import { useViewStore } from "../stores/canvas/view.store";
import { useDatabaseStore } from "../stores/database.store";

export function useDatabaseService() {
    const databaseStore = useDatabaseStore();
    const viewStore = useViewStore();

    async function createDatabase(name: string) {
        const currentViewId = viewStore.currentViewId;
        const res = await databaseStore.createDatabase(name, currentViewId);
        viewStore.addViewNode(res.viewNode);
    }

    async function deleteDatabase(databaseId: string) {
        const res = await databaseStore.deleteDatabase(databaseId);
        viewStore.removeViewNode(res.viewNodeId);
    }

    return { createDatabase, deleteDatabase }
}