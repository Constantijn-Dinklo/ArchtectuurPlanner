<script setup lang="ts">
import { onMounted, ref } from 'vue';

import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { Checkbox, Select, Menu, Button } from 'primevue'

import { useDatabaseConnectionStore, type DatabaseConnection, type DatabaseOperation } from '../stores/databaseConnection.store';
import { useDatabaseConnectionService } from '../services/databaseConnection.service';
import { useResourceService } from '../services/resource.service';

const databaseConnectionService = useDatabaseConnectionService();
const databaseConnectionStore = useDatabaseConnectionStore();

const resourceService = useResourceService();

const menu = ref();
const selectedRow = ref();

const menuItems = ref([
  {
    label: 'Delete',
    icon: 'pi pi-trash',
    command: () => {
      if (selectedRow.value) {
        deleteDatabaseConnection(selectedRow.value.id);
      }
    }
  }
]);

onMounted(() => {
  databaseConnectionStore.fetchDatabaseConnections();
});

function addDBConnection() {
  databaseConnectionStore.createDatabaseConnection('', '');
}

function onCellEditComplete(event: any){
  const { data, newValue, field } = event;
  //TODO: add in a check to make sure that the sourceId an targetId are not equal
  databaseConnectionService.updateDatabaseConnection(data.id, { [field]: newValue })
}

function hasOperation(data: DatabaseConnection, operation: DatabaseOperation) {
    return data.operation.includes(operation);
}

function toggleOperation(data: DatabaseConnection, operation: DatabaseOperation, checked: boolean) {
    let operations = [...data.operation];

    if (checked) {
        if (!operations.includes(operation)) {
            operations.push(operation);
        }
    } else {
        operations = operations.filter(op => op !== operation);
    }

    databaseConnectionService.updateDatabaseConnection(data.id, {
        operation: operations
    });
}

function toggleMenu(event: Event, row: any) {
  selectedRow.value = row;
  menu.value.toggle(event);
}

function deleteDatabaseConnection(id: string) {
  databaseConnectionService.deleteDatabaseConnection(id);
}
</script>

<template>
    <button @click="addDBConnection">
        Add DB Connection
    </button>
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
        <Column field="entityId" header="Entity">
            <template #body="{ data }">
                {{
                    resourceService.getByType('application').find(entity => entity.id === data.entityId)?.name || ''
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
        <Column field="operation" header="Read">
            <template #body="{ data }">
                <Checkbox
                    binary
                    :modelValue="hasOperation(data, 'read')"
                    @update:modelValue="checked => toggleOperation(data, 'read', checked)"
                />
            </template>
        </Column>
        <Column field="operation" header="Write">
            <template #body="{ data }">
                <Checkbox
                    binary
                    :modelValue="hasOperation(data, 'write')"
                    @update:modelValue="checked => toggleOperation(data, 'write', checked)"
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