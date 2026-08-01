<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { useSelectedNodeProjection } from '../../projections/selectedNode.projection';
    import { useTableStore, type Table } from '../../stores/resources/table.store';

    const selectedNodeProjection = useSelectedNodeProjection();
    const tableStore = useTableStore();

    
    const newColumnName = ref('');

    const table = computed(
        () => selectedNodeProjection.nodeInfo.value?.node as Table | undefined
    );

    function createColumn(tableId: string){
        tableStore.createColumn(tableId, newColumnName.value);
    }

    function deleteColumn(tableId: string, column: string){
        tableStore.deleteColumn(tableId, column);
    }

</script>

<template>
    <div v-if="table">
        {{ table.name }}
        <div>
            Columns:
            <div>
                <input type="text" v-model="newColumnName" placeholder="Column name" @keyup.enter="createColumn(table.id)"/>
                <button @click="createColumn(table.id)">Add</button>
            </div>
            <div v-for="column in table.columns">
                {{ column }}
                <button @click="deleteColumn(table.id, column)">X</button>
            </div>
        </div>
    </div>
    
</template>