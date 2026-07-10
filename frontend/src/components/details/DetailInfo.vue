
<script setup lang="ts">
    import { useSelectedEdgeProjection } from '../../projections/selectedEdge.projection.ts';
    import { useSelectedNodeProjection } from '../../projections/selectedNode.projection.ts';
    import ConnectionsDetail from '../ConnectionsDetail.vue';
    import DatabaseDetails from './DatabaseDetails.vue';
    import ServerDetails from './ServerDetails.vue';

    const selectedNodeProjection = useSelectedNodeProjection();
    const selectedEdgeProjection = useSelectedEdgeProjection();

    console.log(selectedNodeProjection.nodeInfo);
</script>

<template>

    <div v-if="selectedNodeProjection.isNodeSelected() && selectedNodeProjection.nodeInfo.value">
        <div v-if="selectedNodeProjection.nodeInfo.value.node.type === 'database'">
            <DatabaseDetails />
        </div>
        <div v-else-if="selectedNodeProjection.nodeInfo.value.node.type === 'server'">
            <ServerDetails />
        </div>
        <div v-else>
            {{ selectedNodeProjection.nodeInfo.value.node.name }}
            <ConnectionsDetail :connections-info="selectedNodeProjection.nodeInfo.value.connections" />
        </div>
    </div>

    <div v-if="selectedEdgeProjection.isEdgeSelected() && selectedEdgeProjection.connectionsInfo.value">
        <ConnectionsDetail :connections-info="selectedEdgeProjection.connectionsInfo.value" />
    </div>
</template>