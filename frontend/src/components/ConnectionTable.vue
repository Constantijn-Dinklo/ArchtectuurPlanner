<script setup lang="ts">

import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { Select } from 'primevue'
import { useApplicationStore } from '../stores/application.store';
import { useConnectionStore } from '../stores/connection.store';
import { onMounted } from 'vue';
import { useConnectionService } from '../services/connection.service';


const applicationStore = useApplicationStore();
const connectionStore = useConnectionStore();
const connectionService = useConnectionService();

onMounted(() => {
  connectionService.fetchConnections();
})

function addConnection() {
  connectionStore.createConnection('', '')
}

function onCellEditComplete(event: any){
  const { data, newValue, field } = event
  //TODO: add in a check to make sure that the sourceId an targetId are not equal
  connectionService.updateConnection(data.id, { [field]: newValue })
}
</script>

<template>
  <button @click="addConnection">
    Add Connection
  </button>
  <DataTable
    :value="connectionStore.connections"
    editMode="cell"
    @cell-edit-complete="onCellEditComplete"
    tableStyle="min-width: 50rem"
  >
    <Column field="id" header="ID" />
    <Column field="sourceId" header="From">
      <template #body="{ data }">
        {{
            applicationStore.applications.find(a => a.id === data.sourceId)?.name || ''
        }}
      </template>
      
      <template #editor="{ data, field }">
        <Select 
          v-model="data[field]"
          :options="applicationStore.applications.filter((app) => app.id !== data.targetId)"
          optionLabel="name"
          optionValue="id"
          placeholder="Select application"
        />
      </template>
    </Column>
    <Column field="targetId" header="to"> 
      <template #body="{ data }">
        {{
            applicationStore.applications.find(a => a.id === data.targetId)?.name || ''
        }}
      </template>
      
      <template #editor="{ data, field }">
        <Select 
          v-model="data[field]"
          :options="applicationStore.applications.filter((app) => app.id !== data.sourceId)"
          optionLabel="name"
          optionValue="id"
          placeholder="Select application"
        />
      </template>
    </Column>
  </DataTable>
</template>