import { defineStore } from "pinia";
import { ref } from "vue";
import { useToast } from "primevue";

import api from "../../helpers/axios";
import type { BaseResource } from "../../types/resource.type";

export interface Server extends BaseResource {
    type: 'server';
    ip?: string;
    entityIds: string[];
}

export const useServerStore = defineStore('server', () => {
    const servers = ref<Server[]>([]);

    const toast = useToast();

    async function fetchServers() {
        const res = await api.get('/servers');
        const data = res.data as Server[];
        servers.value = data.map((d) => ({ 
            ...d,
            type: 'server'
        }));;
    }

    async function createServer(name: string, viewId: string) {
        const res = await api.post('/servers', {
            name,
            viewId
        });
        const newServer: Server = {
            id: res.data.server.id,
            name: res.data.server.name,
            type: 'server',
            ip: res.data.server.ip,
            entityIds: res.data.server.entityIds,
        }
        servers.value.push(newServer);
        return res.data;
    }

    async function updateServer(id: string, patch: Partial<Server>) {
        const res = await api.patch(`/servers/${id}`, patch);
        const server = servers.value.find(s => s.id === id);
        if(!server) return;
        const result: Server = Object.assign(server, res.data);
        return result;
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


    return { servers, fetchServers, createServer, updateServer, deleteServer, addServerEntityId, updateServerEntityIds, removeServerEntityIds }
});