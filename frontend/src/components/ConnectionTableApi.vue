<script setup lang="ts">
import { onMounted, ref } from 'vue';

import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { Select, Menu, Button } from 'primevue'

import { useApiConnectionStore } from '../stores/apiConnection.store';
import { useApiConnectionService } from '../services/apiConnection.service';
import { useApiStore } from '../stores/api.store';
import { useResourceService } from '../services/resources/resource.service';

const resourceService = useResourceService();
const apiConnectionStore = useApiConnectionStore();
const apiConnectionService = useApiConnectionService();
const apiStore = useApiStore();

const menu = ref();
const selectedRow = ref();

const menuItems = ref([
  {
    label: 'Delete',
    icon: 'pi pi-trash',
    command: () => {
      if (selectedRow.value) {
        deleteApiConnection(selectedRow.value.id);
      }
    }
  }
]);

onMounted(() => {
  apiConnectionService.fetchApiConnections();
})

function addApiConnection() {
  apiConnectionStore.createApiConnection('', '', '', '');
}

function onCellEditComplete(event: any){
  const { data, newValue, field } = event
  //TODO: add in a check to make sure that the sourceId an targetId are not equal
  apiConnectionService.updateApiConnection(data.id, { [field]: newValue })
}

function toggleMenu(event: Event, row: any) {
  selectedRow.value = row;
  menu.value.toggle(event);
}

function deleteApiConnection(id: string) {
  apiConnectionService.deleteApiConnection(id);
}
</script>

<template>
  <button @click="addApiConnection">
    Add Connection
  </button>
  <DataTable
    :value="apiConnectionStore.apiConnections"
    editMode="cell"
    @cell-edit-complete="onCellEditComplete"
    tableStyle="min-width: 50rem"
  >
    <Column field="id" header="ID" />
    <Column field="sourceId" header="From">
      <template #body="{ data }">
        {{
            resourceService.getByType('application').find(a => a.id === data.sourceId)?.name || ''
        }}
      </template>
      
      <template #editor="{ data, field }">
        <Select 
          v-model="data[field]"
          :options="resourceService.getByType('application').filter((app) => app.id !== data.targetId)"
          optionLabel="name"
          optionValue="id"
          placeholder="Select application"
        />
      </template>
    </Column>
    <Column field="sourceUrlId" header="Url">
      <template #body="{ data }">
        {{
            apiStore.apis.find(a => a.id === data.sourceUrlId)?.url || ''
        }}
      </template>
      <template #editor="{ data, field }">
        <Select 
          v-model="data[field]"
          :options="apiStore.getApplicationApis(data['sourceId'])"
          optionLabel="url"
          optionValue="id"
          placeholder="Select url"
        />
      </template>
    </Column>
    <Column field="targetId" header="to"> 
      <template #body="{ data }">
        {{
            resourceService.getByType('application').find(a => a.id === data.targetId)?.name || ''
        }}
      </template>
      
      <template #editor="{ data, field }">
        <Select 
          v-model="data[field]"
          :options="resourceService.getByType('application').filter((app) => app.id !== data.sourceId)"
          optionLabel="name"
          optionValue="id"
          placeholder="Select application"
        />
      </template>
    </Column>
    <Column>
      <template #body="{ data }">
        <Button
          icon="pi pi-ellipsis-v"
          text
          @click="toggleMenu($event, data)"
        />
      </template>
    </Column>
    <Menu
      ref="menu"
      :model="menuItems"
      popup
    />
  </DataTable>
</template>