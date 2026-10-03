<script setup lang="ts">
    import { computed } from 'vue';
    import { useSelectedNodeProjection } from '../../projections/selectedNode.projection';
    import { useServerStore, type Server } from '../../stores/resources/server.store';

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
        <header class="detail-header">
            <span class="detail-header-icon server"><i class="pi pi-server" /></span>
            <div class="detail-header-text">
                <span class="detail-type-label">Server</span>
                <h2>{{ server.name }}</h2>
            </div>
        </header>

        <section class="detail-section">
            <div class="detail-section-title">Properties</div>

            <label class="detail-property">
                <span class="detail-property-label">IP address</span>
                <input
                    v-model="server.ip"
                    type="text"
                    class="detail-input"
                    placeholder="0.0.0.0"
                    @change="onIPChange"
                />
            </label>
        </section>
    </div>
</template>