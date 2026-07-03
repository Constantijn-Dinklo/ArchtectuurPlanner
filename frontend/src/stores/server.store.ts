import { defineStore } from "pinia";
import { ref } from "vue";
import api from "../helpers/axios";
import { useToast } from "primevue";

export interface Server {
    id: string;
    name: string;
    IP?: string;
    entityIds: string[];
}

export const useServerStore = defineStore('server', () => {
    const servers = ref<Server[]>([]);

    const toast = useToast();

    async function fetchServers() {
        const res = await api.get('/servers');
        const data = res.data as Server[];
        servers.value = data;
    }

    async function createServer(name: string, viewId: string) {
        const res = await api.post('/servers', {
            name,
            viewId
        });
        const newServer: Server = {
            id: res.data.server.id,
            name: res.data.server.name,
            IP: res.data.server.IP,
            entityIds: res.data.server.entityIds,
        }
        servers.value.push(newServer);
        return res.data;
    }

    async function deleteServer(serverId: string) {
        try {
            const res = await api.delete(`/servers/${serverId}`);
            servers.value = servers.value.filter((server) => server.id !== res.data.serverId);
            return res.data;
        }
        catch(error: any) {
            if(error.response?.status === 409){
                toast.add({
                    severity: 'warn',
                    summary: error.response.data.message,
                    life: 3000
                })
            }
        }
    }

    async function addServerEntityId(serverId: string, entityId: string) {
        const res = await api.post(`/servers/${serverId}/entity`, {
            entityId,
        });
        const server = servers.value.find((server) => server.id === serverId);
        if(!server) return;
        server.entityIds = res.data;
    }

    async function updateServerEntityIds(serverId: string) {
        const server = servers.value.find((server) => server.id === serverId);
        if(!server) return;
        const res = await api.patch(`/servers/${serverId}/entity`, {
            entityIds: server?.entityIds,
        });
        server.entityIds = res.data.entityIds;
    }

    async function removeServerEntityIds(serverId: string, entityIndex: number) {
        const server = servers.value.find((server) => server.id === serverId);
        if(!server) return;
        const updatedEntityIds = server.entityIds.filter((_, index) => index !== entityIndex);
        const res = await api.patch(`/servers/${serverId}/entity`, {
            entityIds: updatedEntityIds,
        });
        server.entityIds = res.data.entityIds;
    }


    return { servers, fetchServers, createServer, deleteServer, addServerEntityId, updateServerEntityIds, removeServerEntityIds }
});