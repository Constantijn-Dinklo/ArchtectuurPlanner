import { defineStore } from "pinia";
import { ref } from "vue";
import { useToast } from "primevue";
import api from "../helpers/axios";
import type { Connection, ConnectionInput, ConnectionPatch } from "../types/connection.types";
import { useInformationRelationStore } from "./information/informationRelation.store";
import { useExternalService } from "../services/resources/external.service";
import { useApplicationService } from "../services/resources/application.service";

export const useConnectionStore = defineStore('connection', () => {
    const connections = ref<Connection[]>([]);

    const toast = useToast();

    async function fetchConnections() {
        const res = await api.get<Connection[]>('/connections');
        connections.value = res.data;
    }

    function getConnection(id: string | null | undefined) {
        return id ? connections.value.find(connection => connection.id === id) : undefined;
    }

    // The connections from the source to the target, or in both directions
    function getConnectionsBetween(sourceId: string, targetId: string, bothDirections = false) {
        return connections.value.filter(connection =>
            (connection.source.id === sourceId && connection.target.id === targetId) ||
            (bothDirections && connection.source.id === targetId && connection.target.id === sourceId)
        );
    }

    // The connections of a part, in either direction
    function getPartConnections(partId: string) {
        return connections.value.filter(connection => connection.source.id === partId || connection.target.id === partId);
    }

    // The relations through a connection change with it, and with them the inputs of applications
    // and what external elements receive
    async function refreshAfterChange() {
        await Promise.all([
            useInformationRelationStore().fetchInformationRelations(),
            useApplicationService().fetchApplications(),
            useExternalService().fetchExternals()
        ]);
    }

    // The backend refuses a connection that does not fit (an api of another resource, ends that do not exist), so show why
    async function withErrorToast<T>(request: () => Promise<T>): Promise<T | undefined> {
        try {
            const result = await request();
            await refreshAfterChange();
            return result;
        }
        catch(error: any) {
            toast.add({
                severity: 'warn',
                summary: error.response?.data?.error ?? 'Could not change the connection',
                life: 3000
            });
            return undefined;
        }
    }

    function createConnection(input: ConnectionInput) {
        return withErrorToast(async () => {
            const res = await api.post<Connection>('/connections', input);
            connections.value.push(res.data);
            return res.data;
        });
    }

    // Connects the two when nothing connects them yet; the backend chooses the kind that fits them
    function connectParts(sourceId: string, targetId: string) {
        return withErrorToast(async () => {
            const res = await api.post<Connection>('/connections/connect', { sourceId, targetId });
            if (!getConnection(res.data.id)) connections.value.push(res.data);
            return res.data;
        });
    }

    function updateConnection(id: string, patch: ConnectionPatch) {
        return withErrorToast(async () => {
            const res = await api.patch<Connection>(`/connections/${id}`, patch);
            connections.value = connections.value.map(connection => connection.id === id ? res.data : connection);
            return res.data;
        });
    }

    // Everything that goes through the connection goes with it
    function deleteConnection(id: string) {
        return withErrorToast(async () => {
            await api.delete(`/connections/${id}`);
            connections.value = connections.value.filter(connection => connection.id !== id);
            return true;
        });
    }

    return {
        connections,
        fetchConnections,
        getConnection,
        getConnectionsBetween,
        getPartConnections,
        createConnection,
        connectParts,
        updateConnection,
        deleteConnection
    };
});
