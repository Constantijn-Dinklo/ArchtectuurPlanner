import { useViewStore } from "../stores/canvas/view.store";
import { useFileLocationStore } from "../stores/fileLocation.store";

export function useFileLocationService() {
    const fileLocationStore = useFileLocationStore();
    const viewStore = useViewStore();

    async function createFileLocation(name: string) {
        const currentViewId = viewStore.currentViewId;
        const res = await fileLocationStore.createFileLocation(name, currentViewId);
        viewStore.addViewNode(res.viewNode);
    }

    async function deleteFileLocation(applicationId: string) {
        const res = await fileLocationStore.deleteFileLocation(applicationId);
        viewStore.removeViewNode(res.viewNodeId);
    }

    return { createFileLocation, deleteFileLocation }
}