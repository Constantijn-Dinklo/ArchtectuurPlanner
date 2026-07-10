<script setup lang="ts">
    import { computed } from 'vue';
    import { useSelectedNodeProjection } from '../../projections/selectedNode.projection';
    import { useServerStore, type Server } from '../../stores/server.store';

    const selectedNodeProjection = useSelectedNodeProjection();
    const serverStore = useServerStore();

    const server = computed(
        () => selectedNodeProjection.nodeInfo.value?.node as Server | undefined
    );

    function onIPChange(){
        if(!server.value) { return }
        serverStore.updateServer(server.value.id, server.value);
    }
</script>

<template>
    <div v-if="server">
        <div>
            {{ server.name }}
        </div>
        <div>
            IP: <input v-model="server.ip" type="text" @change="onIPChange"/>
        </div>
    </div>
</template>