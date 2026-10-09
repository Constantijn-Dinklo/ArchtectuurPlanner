import { defineStore } from "pinia";
import { ref } from "vue";
import { useToast } from "primevue";
import api from "../helpers/axios";
import { useInformationRelationStore } from "./information/informationRelation.store";
import { useExternalService } from "../services/resources/external.service";

// How the information gets from the source to the target, as far as it is known
export type OtherConnectionMethod = 'human' | 'feature' | 'file' | 'email' | 'unknown';

export const OTHER_CONNECTION_METHODS: { method: OtherConnectionMethod, label: string, icon: string }[] = [
    { method: 'human', label: 'By hand', icon: 'pi pi-user' },
    { method: 'feature', label: 'Send function', icon: 'pi pi-send' },
    { method: 'file', label: 'File', icon: 'pi pi-file' },
    { method: 'email', label: 'E-mail', icon: 'pi pi-envelope' },
    { method: 'unknown', label: 'Unknown', icon: 'pi pi-question-circle' }
];

export function getOtherConnectionMethodInfo(method: OtherConnectionMethod) {
    return OTHER_CONNECTION_METHODS.find(option => option.method === method)
        ?? OTHER_CONNECTION_METHODS[OTHER_CONNECTION_METHODS.length - 1]!;
}

// A connection between any two resources that is not an api, database connection or script.
// For example a person entering information by hand, a 'send' button in an application of which we do not know
// how it works, a file or an e-mail. It is also the fallback when it is unclear how information is transferred.
export interface OtherConnection {
    id: string;

    sourceId: string | null;
    targetId: string | null;
    method: OtherConnectionMethod;
    description: string;

    // The information of the source that is carried over to the target
    informationFieldIds: string[];
    informationObjectIds: string[];
}

export const useOtherConnectionStore = defineStore('otherConnection', () => {
    const otherConnections = ref<OtherConnection[]>([]);

    const toast = useToast();

    async function fetchOtherConnections() {
        const res = await api.get<OtherConnection[]>('/otherConnections');
        otherConnections.value = res.data;
    }

    function setOtherConnection(updated: OtherConnection) {
        const existing = otherConnections.value.find(connection => connection.id === updated.id);
        if(existing) {
            Object.assign(existing, updated);
        }
    }

    // What an external element receives follows from the connections to it, so reload it after a change
    async function refreshReceivedInformation() {
        await Promise.all([
            useExternalService().fetchExternals(),
            useInformationRelationStore().fetchInformationRelations()
        ]);
    }

    // The backend refuses information the source does not pass on, so show why
    async function withErrorToast(request: () => Promise<void>) {
        try {
            await request();
            await refreshReceivedInformation();
        }
        catch(error: any) {
            toast.add({
                severity: 'warn',
                summary: error.response?.data?.error ?? 'Could not update the connection',
                life: 3000
            });
        }
    }

    async function createOtherConnection() {
        const res = await api.post<OtherConnection>('/otherConnections', {});
        otherConnections.value.push(res.data);
        return res.data.id;
    }

    function updateOtherConnection(id: string, patch: Partial<Pick<OtherConnection, 'sourceId' | 'targetId' | 'method' | 'description'>>) {
        return withErrorToast(async () => {
            const res = await api.patch<OtherConnection>(`/otherConnections/${id}`, patch);
            setOtherConnection(res.data);
        });
    }

    function deleteOtherConnection(id: string) {
        return withErrorToast(async () => {
            await api.delete(`/otherConnections/${id}`);
            otherConnections.value = otherConnections.value.filter(connection => connection.id !== id);
        });
    }

    function addInformationField(id: string, informationFieldId: string) {
        return withErrorToast(async () => {
            const res = await api.post<OtherConnection>(`/otherConnections/${id}/informationFields`, { informationFieldId });
            setOtherConnection(res.data);
        });
    }

    function removeInformationField(id: string, informationFieldId: string) {
        return withErrorToast(async () => {
            const res = await api.delete<OtherConnection>(`/otherConnections/${id}/informationFields/${informationFieldId}`);
            setOtherConnection(res.data);
        });
    }

    function addInformationObject(id: string, informationObjectId: string) {
        return withErrorToast(async () => {
            const res = await api.post<OtherConnection>(`/otherConnections/${id}/informationObjects`, { informationObjectId });
            setOtherConnection(res.data);
        });
    }

    function removeInformationObject(id: string, informationObjectId: string) {
        return withErrorToast(async () => {
            const res = await api.delete<OtherConnection>(`/otherConnections/${id}/informationObjects/${informationObjectId}`);
            setOtherConnection(res.data);
        });
    }

    return {
        otherConnections,
        fetchOtherConnections,
        createOtherConnection,
        updateOtherConnection,
        deleteOtherConnection,
        addInformationField,
        removeInformationField,
        addInformationObject,
        removeInformationObject
    }
});
