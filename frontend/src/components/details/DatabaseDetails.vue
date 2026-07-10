<script setup lang="ts">
    import { computed } from 'vue';
    import { useSelectedNodeProjection } from '../../projections/selectedNode.projection';
    import { useDatabaseStore, type Database } from '../../stores/database.store';

    import ConnectionsDetail from '../ConnectionsDetail.vue';

    const selectedNodeProjection = useSelectedNodeProjection();
    const databaseStore = useDatabaseStore();

    const database = computed(
        () => selectedNodeProjection.nodeInfo.value?.node as Database | undefined
    );

    function onEngineChange() {
        if(!database.value) { return }
        databaseStore.updateDatabase(database.value.id, database.value)
    }
</script>

<template>
    <div v-if="database">
        <div>
            {{ database.name }}
        </div>
        <div>
            Engine:
            <select v-model="database.engine" @change="onEngineChange">
                <option key="SQL" value="SQL">SQL</option>
                <option key="MySQL" value="MySQL">MySQL</option>
                <option key="NoSQL" value="NoSQL">NoSQL</option>
            </select>
        </div>
         <div v-if="selectedNodeProjection.nodeInfo.value">
            <ConnectionsDetail :connections-info="selectedNodeProjection.nodeInfo.value.connections"/>
        </div>
    </div>
</template>