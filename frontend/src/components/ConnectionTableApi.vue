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
  <div class="connection-table-toolbar">
    <span class="toolbar-hint">Click a cell to edit it</span>
    <Button
      label="Add connection"
      icon="pi pi-plus"
      size="small"
      @click="addApiConnection"
    />
  </div>
  <DataTable
    :value="apiConnectionStore.apiConnections"
    editMode="cell"
    size="small"
    class="connection-table"
    @cell-edit-complete="onCellEditComplete"
    tableStyle="min-width: 50rem"
  >
    <template #empty>
      <div class="table-empty">No API connections yet</div>
    </template>

    <Column field="id" header="ID">
      <template #body="{ data }">
        <span class="cell-id" :title="data.id">…{{ data.id.slice(-6) }}</span>
      </template>
    </Column>
    <Column field="sourceId" header="From">
      <template #body="{ data }">
        <span
          v-if="resourceService.getByType('application').find(a => a.id === data.sourceId)"
          class="cell-resource"
        >
          <i class="pi pi-desktop" />
          {{ resourceService.getByType('application').find(a => a.id === data.sourceId)?.name }}
        </span>
        <span v-else class="cell-empty">Select application</span>
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
        <span
          v-if="apiStore.apis.find(a => a.id === data.sourceUrlId)"
          class="cell-resource"
        >
          <i class="pi pi-globe" />
          {{ apiStore.apis.find(a => a.id === data.sourceUrlId)?.url }}
        </span>
        <span
          v-else
          class="cell-warning"
          title="This API connection has no url to transfer information"
        >
          <i class="pi pi-exclamation-triangle" />
          Select url
        </span>
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
    <Column field="targetId" header="To">
      <template #body="{ data }">
        <span
          v-if="resourceService.getByType('application').find(a => a.id === data.targetId)"
          class="cell-resource"
        >
          <i class="pi pi-desktop" />
          {{ resourceService.getByType('application').find(a => a.id === data.targetId)?.name }}
        </span>
        <span v-else class="cell-empty">Select application</span>
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
    <Column style="width: 3rem">
      <template #body="{ data }">
        <Button
          icon="pi pi-ellipsis-v"
          text
          rounded
          size="small"
          severity="secondary"
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