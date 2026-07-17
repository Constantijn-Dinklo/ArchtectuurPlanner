<script setup lang="ts">
    import { computed, onMounted, ref } from 'vue';
    import { useSelectedNodeProjection } from '../../projections/selectedNode.projection';
    import { useDatabaseStore, type Database } from '../../stores/resources/database.store';

    import ConnectionsDetail from '../ConnectionsDetail.vue';
    import { useTableStore } from '../../stores/resources/table.store.ts';
    import { useTableService } from '../../services/resources/table.service.ts';

    const selectedNodeProjection = useSelectedNodeProjection();
    const databaseStore = useDatabaseStore();
    const tableStore = useTableStore();
    const tableService = useTableService();

    const newTableName = ref('');

    const database = computed(
        () => selectedNodeProjection.nodeInfo.value?.node as Database | undefined
    );

    onMounted(() => {
        tableStore.fetchTables();
    })

    function onEngineChange() {
        if(!database.value) { return }
        databaseStore.updateDatabase(database.value.id, database.value)
    }

    function createTable(databaseId: string) {
        tableService.createTable(newTableName.value, databaseId);
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
        <div>
            Tables:
            <div>
                <input type="text" v-model="newTableName" placeholder="Table name" @keyup.enter="createTable(database.id)"/>
                <button @click="createTable(database.id)">Add</button>
            </div>
            <div v-for="table in tableStore.getTables(database.id)">
                {{ table.name }}
            </div>
        </div>
         <div v-if="selectedNodeProjection.nodeInfo.value">
            <ConnectionsDetail :connections-info="selectedNodeProjection.nodeInfo.value.connections"/>
        </div>
    </div>
</template>