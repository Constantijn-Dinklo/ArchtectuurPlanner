<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useServerService } from '../services/resources/server.service';
import { useServerStore } from '../stores/resources/server.store';
import { useResourceService } from '../services/resources/resource.service';

const serverService = useServerService();
const serverStore = useServerStore();

const resourceService = useResourceService();

const newServerName = ref('');

const tempServerId = ref<string | null>(null);
const tempId = ref('');

onMounted(() => {
    serverStore.fetchServers();
});

function addServer() {
    serverService.createServer(newServerName.value);
}

function removeServer(serverId: string) {
    serverService.removeServer(serverId);
}

function addTempEntity(serverId: string) {
    tempServerId.value = serverId;
    tempId.value = '';
}

function addEntity(serverId: string) {
    serverStore.addServerEntityId(serverId, tempId.value);

    tempServerId.value = null;
    tempId.value = '';
}

function updateEntity(serverId: string){
    serverStore.updateServerEntityIds(serverId);
}

function removeEntity(serverId: string, index: number) {
    serverStore.removeServerEntityIds(serverId, index)
}

</script>

<template>
    Servers
    <div>
        <input type="text" v-model="newServerName" placeholder="Server name" @keyup.enter="addServer"/>
        <button @click="addServer">Add</button>
    </div>
    <div>
        <ul>
            <li v-for="server in serverStore.servers">
                <button @click="addTempEntity(server.id)">+</button>
                {{ server.name }}
                <button class="btn-primary" @click="removeServer(server.id)">X</button>
                <ul>
                    <li v-for="(entityId, index) in server.entityIds" :key="entityId">
                        <select v-model="server.entityIds[index]" @change="updateEntity(server.id)">
                            <option
                                v-for="resource in resourceService.getByType('database')"
                                :key="resource.id"
                                :value="resource.id"
                                :disabled="server.entityIds.includes(resource.id)"
                            >
                                {{ resource.name }}
                            </option>
                        </select>
                        <button @click="removeEntity(server.id, index)">-</button>
                    </li>
                    <li v-if="tempServerId === server.id">
                        <select v-model="tempId" @change="addEntity(server.id)">
                            <option value="">-- Select database --</option>
                            <option
                                v-for="resource in resourceService.getByType('database')"
                                :key="resource.id"
                                :value="resource.id"
                                :disabled="server.entityIds.includes(resource.id)"
                            >
                                {{ resource.name }}
                            </option>
                        </select>
                    </li>
                </ul>
            </li>
        </ul>
    </div>
</template>