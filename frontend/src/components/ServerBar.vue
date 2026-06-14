<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useServerService } from '../services/server.service';
import { useServerStore } from '../stores/server.store';

const serverService = useServerService();
const serverStore = useServerStore();

const newServerName = ref('');

onMounted(() => {
    serverStore.fetchServers();
});

function addServer() {
    serverService.createServer(newServerName.value);
}

// function removeDatabase(id: string) {
//     resourceService.removeResource(id);
// }

</script>

<template>
    Servers
    <div>
        <input type="text" v-model="newServerName" placeholder="Server name"/>
        <button @click="addServer">Add</button>
    </div>
    <div>
        <ul>
            <li v-for="server in serverStore.servers">
                {{ server.name }}
                <!-- <button class="btn-primary" @click="removeDatabase(database.id)">X</button> -->
            </li>
        </ul>
    </div>
</template>