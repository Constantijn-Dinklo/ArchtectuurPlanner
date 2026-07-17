import { useApplicationStore } from "../../stores/resources/application.store";
import { useViewStore } from "../../stores/canvas/view.store";

export function useApplicationService() {
    const applicationStore = useApplicationStore();
    const viewStore = useViewStore();

    async function createAppliction(name: string) {
        const currentViewId = viewStore.currentViewId;
        const res = await applicationStore.createAppliction(name, currentViewId);
        viewStore.addViewNode(res.viewNode);
    }

    async function deleteApplication(applicationId: string) {
        const res = await applicationStore.deleteApplication(applicationId);
        viewStore.removeViewNode(res.viewNodeId);
    }

    return { createAppliction, deleteApplication }
}