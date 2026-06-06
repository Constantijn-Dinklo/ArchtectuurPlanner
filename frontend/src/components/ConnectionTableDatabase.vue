<script setup lang="ts">
import { onMounted } from 'vue';

import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { Select, Menu, Button } from 'primevue'

import { useDatabaseConnectionStore } from '../stores/databaseConnection.store';
import { useDatabaseConnectionService } from '../services/databaseConnection.service';
import { useResourceService } from '../services/resource.service';

const databaseConnectionService = useDatabaseConnectionService();
const databaseConnectionStore = useDatabaseConnectionStore();

const resourceService = useResourceService();

onMounted(() => {
  databaseConnectionService.fetchDatabaseConnections();
});

function addDBConnection() {
  databaseConnectionStore.createDatabaseConnection('', '');
}

function onCellEditComplete(event: any){
  const { data, newValue, field } = event;
  //TODO: add in a check to make sure that the sourceId an targetId are not equal
  databaseConnectionService.updateDatabaseConnection(data.id, { [field]: newValue })
}
</script>

<template>
    <button @click="addDBConnection">
        Add DB Connection
    </button>
    <div>
        {{ databaseConnectionStore.databaseConnections }}
    </div>
    <DataTable
        :value="databaseConnectionStore.databaseConnections"
        editMode="cell"
        @cell-edit-complete="onCellEditComplete"
        tableStyle="min-width: 50rem"
    >
        <Column field="id" header="ID"></Column>
        <Column field="databaseId" header="Database">
            <template #body="{ data }">
                {{
                    resourceService.getByType('database').find(db => db.id === data.databaseId)?.name || ''
                }}
            </template>
            
            <template #editor="{ data, field }">
                <Select 
                    v-model="data[field]"
                    :options="resourceService.getByType('database').filter((db) => db.id !== data.databaseId)"
                    optionLabel="name"
                    optionValue="id"
                    placeholder="Select database"
                />
            </template>
        </Column>
        <Column field="targetId" header="Target">
            <template #body="{ data }">
                {{
                    resourceService.getByType('application').find(target => target.id === data.targetId)?.name || ''
                }}
            </template>
            
            <template #editor="{ data, field }">
                <Select 
                    v-model="data[field]"
                    :options="resourceService.getByType('application')"
                    optionLabel="name"
                    optionValue="id"
                    placeholder="Select application"
                />
            </template>
        </Column>
    </DataTable>
</template>