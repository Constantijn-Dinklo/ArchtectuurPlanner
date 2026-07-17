<script setup lang="ts">
    import { computed } from 'vue';
    import { useSelectedNodeProjection } from '../../projections/selectedNode.projection';
    import ConnectionsDetail from '../ConnectionsDetail.vue';
    import { useApplicationStore, type Application } from '../../stores/resources/application.store.ts';

    const selectedNodeProjection = useSelectedNodeProjection();
    const applicationStore = useApplicationStore();

    const application = computed(
        () => selectedNodeProjection.nodeInfo.value?.node as Application | undefined
    );

    function onVersionChange() {
        if(!application.value) { return }
        applicationStore.updateApplication(application.value.id, application.value);
    }
</script>

<template>
    <div v-if="application">
        <div>
            {{ application.name }}
        </div>
        <div>
            Version: <input v-model="application.version" type="text" @change="onVersionChange"/>
        </div>
         <div v-if="selectedNodeProjection.nodeInfo.value">
            <ConnectionsDetail :connections-info="selectedNodeProjection.nodeInfo.value.connections"/>
        </div>
    </div>
</template>