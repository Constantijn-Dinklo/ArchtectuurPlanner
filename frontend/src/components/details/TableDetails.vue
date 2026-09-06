<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { useSelectedNodeProjection } from '../../projections/selectedNode.projection';
    import { useTableStore, type Table } from '../../stores/resources/table.store';
    import { useResourceService } from '../../services/resources/resource.service';
import type { AccessibleInformationField } from '../../types/informationField.type';

    const resourceService = useResourceService();

    const selectedNodeProjection = useSelectedNodeProjection();
    const tableStore = useTableStore();
    
    const newColumnName = ref('');
    const inputColumn = ref<AccessibleInformationField | undefined>();

    const table = computed(
        () => selectedNodeProjection.nodeInfo.value?.node as Table | undefined
    );

    function createColumn(tableId: string, newInformationField: boolean = true){
        if(newInformationField){
            tableStore.createColumn(tableId, {
                fieldName: newColumnName.value
            });
        }
        else {
            if(!inputColumn.value) { return }
            tableStore.createColumn(tableId, {
                informationFieldId: inputColumn.value.id,
                sourceResourceId: inputColumn.value.accessibleFromId,
                sourceResourceType: inputColumn.value.accessibleFromType
            });
            inputColumn.value = undefined;
        }
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
                {{ column.fieldName }}
                <button @click="deleteColumn(table.id, column.id)">X</button>
            </div>
            <select v-model="inputColumn" @change="createColumn(table.id, false)">
                <option value="">-- Select Information Field --</option>
                <option
                    v-for="accessibleInformationField in resourceService.getAccessibleInformationFields(table.databaseId)"
                    :key="accessibleInformationField.id"
                    :value="accessibleInformationField"
                    :disabled="table.columns.some((column) => column.id === accessibleInformationField.id)"
                >
                    {{ accessibleInformationField.fieldName }}
                </option>
            </select>
        </div>
    </div>
    
</template>