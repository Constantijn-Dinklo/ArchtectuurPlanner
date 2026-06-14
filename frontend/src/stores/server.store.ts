import { defineStore } from "pinia";
import { ref } from "vue";
import api from "../helpers/axios";

export interface Server {
    id: string;
    name: string;
    IP?: string;
    entityIds: string[];
}

export const useServerStore = defineStore('server', () => {
    const servers = ref<Server[]>([]);

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


    return { servers, fetchServers, createServer }
});