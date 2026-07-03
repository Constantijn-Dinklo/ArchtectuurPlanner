
<script setup lang="ts">
    import { useSelectedEdgeProjection } from '../projections/selectedEdge.projection';
    import { useSelectedResourceProjection } from '../projections/selectedResource.projection';
import ConnectionsDetail from './ConnectionsDetail.vue';

    const selectedResourceProjection = useSelectedResourceProjection();
    const selectedEdgeProjection = useSelectedEdgeProjection();
</script>

<template>

    <div v-if="selectedResourceProjection.getSelectedResourceId() && selectedResourceProjection.resourceInfo.value">
        {{ selectedResourceProjection.resourceInfo.value.resource.name }}
        <ConnectionsDetail :connections-info="selectedResourceProjection.resourceInfo.value.connections" />
    </div>

    <div v-if="selectedEdgeProjection.getSelectedEdge() && selectedEdgeProjection.connectionsInfo.value">
        <ConnectionsDetail :connections-info="selectedEdgeProjection.connectionsInfo.value" />
    </div>
</template>