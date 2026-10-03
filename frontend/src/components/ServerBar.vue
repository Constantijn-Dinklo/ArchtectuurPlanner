<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useServerService } from '../services/resources/server.service';
import { useServerStore } from '../stores/resources/server.store';
import { useResourceService } from '../services/resources/resource.service';

const serverService = useServerService();
const serverStore = useServerStore();

const resourceService = useResourceService();

const newServerName = ref('');
const expanded = ref(true);

const tempServerId = ref<string | null>(null);
const tempId = ref('');

onMounted(() => {
    serverStore.fetchServers();
});

function addServer() {
    if(!newServerName.value.trim()) return;
    serverService.createServer(newServerName.value.trim());
    newServerName.value = '';
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
    <section class="sidebar-section">
        <button
            type="button"
            class="sidebar-section-header"
            @click="expanded = !expanded"
        >
            <span class="sidebar-section-icon server"><i class="pi pi-server" /></span>
            <span class="sidebar-section-title">Servers</span>
            <span class="sidebar-section-count">{{ serverStore.servers.length }}</span>
            <i class="pi pi-chevron-right sidebar-section-chevron" :class="{ expanded }" />
        </button>

        <div v-if="expanded" class="sidebar-section-body">
            <div class="sidebar-add-row">
                <input
                    v-model="newServerName"
                    type="text"
                    class="sidebar-input"
                    placeholder="New server"
                    @keyup.enter="addServer"
                />
                <button
                    type="button"
                    class="sidebar-add-button"
                    title="Add server"
                    :disabled="!newServerName.trim()"
                    @click="addServer"
                >
                    <i class="pi pi-plus" />
                </button>
            </div>

            <div v-if="!serverStore.servers.length" class="sidebar-empty">
                No servers yet
            </div>

            <ul class="sidebar-list">
                <li v-for="server in serverStore.servers" :key="server.id">
                    <div class="sidebar-item">
                        <span class="sidebar-item-name">{{ server.name }}</span>

                        <span class="sidebar-item-actions">
                            <button
                                type="button"
                                class="sidebar-icon-button"
                                title="Add database to server"
                                @click="addTempEntity(server.id)"
                            >
                                <i class="pi pi-plus" />
                            </button>
                            <button
                                type="button"
                                class="sidebar-icon-button danger"
                                title="Delete server"
                                @click="removeServer(server.id)"
                            >
                                <i class="pi pi-trash" />
                            </button>
                        </span>
                    </div>

                    <ul
                        v-if="server.entityIds.length || tempServerId === server.id"
                        class="sidebar-sublist"
                    >
                        <li
                            v-for="(entityId, index) in server.entityIds"
                            :key="entityId"
                            class="sidebar-item"
                        >
                            <i class="pi pi-database sidebar-sub-icon" />
                            <select
                                v-model="server.entityIds[index]"
                                class="sidebar-select"
                                @change="updateEntity(server.id)"
                            >
                                <option
                                    v-for="resource in resourceService.getByType('database')"
                                    :key="resource.id"
                                    :value="resource.id"
                                    :disabled="server.entityIds.includes(resource.id)"
                                >
                                    {{ resource.name }}
                                </option>
                            </select>
                            <span class="sidebar-item-actions">
                                <button
                                    type="button"
                                    class="sidebar-icon-button danger"
                                    title="Remove database from server"
                                    @click="removeEntity(server.id, index)"
                                >
                                    <i class="pi pi-times" />
                                </button>
                            </span>
                        </li>
                        <li v-if="tempServerId === server.id" class="sidebar-item">
                            <i class="pi pi-database sidebar-sub-icon" />
                            <select
                                v-model="tempId"
                                class="sidebar-select"
                                @change="addEntity(server.id)"
                            >
                                <option value="">Select database</option>
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
    </section>
</template>