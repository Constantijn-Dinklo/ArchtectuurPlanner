import { defineStore } from "pinia";
import { ref } from "vue";
import { useToast } from "primevue";
import api from "../helpers/axios";

// Information flows from the source to the target because a person manually enters it into the target
export interface HumanConnection {
    id: string;

    sourceId: string | null;
    targetId: string | null;
    description: string;

    // The information of the source that is carried over to the target
    informationFieldIds: string[];
    informationObjectIds: string[];
}

export const useHumanConnectionStore = defineStore('humanConnection', () => {
    const humanConnections = ref<HumanConnection[]>([]);

    const toast = useToast();

    async function fetchHumanConnections() {
        const res = await api.get<HumanConnection[]>('/humanConnections');
        humanConnections.value = res.data;
    }

    function setHumanConnection(updated: HumanConnection) {
        const existing = humanConnections.value.find(connection => connection.id === updated.id);
        if(existing) {
            Object.assign(existing, updated);
        }
    }

    async function createHumanConnection() {
        const res = await api.post<HumanConnection>('/humanConnections', {});
        humanConnections.value.push(res.data);
        return res.data.id;
    }

    async function updateHumanConnection(id: string, patch: Partial<Pick<HumanConnection, 'sourceId' | 'targetId' | 'description'>>) {
        const res = await api.patch<HumanConnection>(`/humanConnections/${id}`, patch);
        setHumanConnection(res.data);
    }

    async function deleteHumanConnection(id: string) {
        await api.delete(`/humanConnections/${id}`);
        humanConnections.value = humanConnections.value.filter(connection => connection.id !== id);
    }

    // The backend refuses information the source does not output, so show why
    async function withErrorToast(request: () => Promise<void>) {
        try {
            await request();
        }
        catch(error: any) {
            toast.add({
                severity: 'warn',
                summary: error.response?.data?.error ?? 'Could not update the human connection',
                life: 3000
            });
        }
    }

    function addInformationField(id: string, informationFieldId: string) {
        return withErrorToast(async () => {
            const res = await api.post<HumanConnection>(`/humanConnections/${id}/informationFields`, { informationFieldId });
            setHumanConnection(res.data);
        });
    }

    function removeInformationField(id: string, informationFieldId: string) {
        return withErrorToast(async () => {
            const res = await api.delete<HumanConnection>(`/humanConnections/${id}/informationFields/${informationFieldId}`);
            setHumanConnection(res.data);
        });
    }

    function addInformationObject(id: string, informationObjectId: string) {
        return withErrorToast(async () => {
            const res = await api.post<HumanConnection>(`/humanConnections/${id}/informationObjects`, { informationObjectId });
            setHumanConnection(res.data);
        });
    }

    function removeInformationObject(id: string, informationObjectId: string) {
        return withErrorToast(async () => {
            const res = await api.delete<HumanConnection>(`/humanConnections/${id}/informationObjects/${informationObjectId}`);
            setHumanConnection(res.data);
        });
    }

    return {
        humanConnections,
        fetchHumanConnections,
        createHumanConnection,
        updateHumanConnection,
        deleteHumanConnection,
        addInformationField,
        removeInformationField,
        addInformationObject,
        removeInformationObject
    }
});
