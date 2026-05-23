import api from "../helpers/axios";
import { useApplicationStore, type Application } from "../stores/application.store";
import { useCanvasStore } from "../stores/canvas.store";

export function useApplicationService() {
    const applicationStore = useApplicationStore();
    const canvasStore = useCanvasStore();

    async function fetchApplications() {
        const res = await api.get('/applications');
        const data = res.data as Application[];
        applicationStore.setApplications(data);

        data.map((app) => {
            canvasStore.addNode(app.id, app.name);
        });
    }

    async function addApplication(name: string) {
        const newAppID = await applicationStore.createApplication(name);
        canvasStore.addNode(newAppID, name);
    }

    async function removeApplication(applicationId: string) {
        const deletedAppID = await applicationStore.deleteApplication(applicationId);
        canvasStore.removeNodeApplicationId(deletedAppID);
    }

    return { fetchApplications, addApplication, removeApplication }
}