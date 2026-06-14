<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { Button, InputText, Menu, Select } from 'primevue'

import { onMounted, ref, type Ref } from 'vue';
import { useScriptStore, type Script } from '../stores/script.store';
import { useScriptService } from '../services/script.service';
import { useResourceService } from '../services/resource.service';

const scriptStore = useScriptStore();
const scriptService = useScriptService();

const resourceService = useResourceService();

const menu = ref();
const selectedRow: Ref<any, Script> = ref();

const menuItems = ref([
  {
    label: 'Delete',
    icon: 'pi pi-trash',
    command: () => {
      if (selectedRow.value) {
        deleteScript(selectedRow.value.id);
      }
    }
  }
]);

onMounted(() => {
  scriptService.fetchScripts();
});

function addInput(script: Script) {
  scriptStore.addInput(script.id);
}

function removeInput(scriptId: string, index: number | string) {
  scriptService.removeInput(scriptId, index as number);
}

function addOutput(script: Script) {
  scriptStore.addOutput(script.id);
}

function removeOutput(scriptId: string, index: number | string) {
  scriptService.removeOutput(scriptId, index as number);
}

function updateInput(script: Script) {
  scriptService.updateScript(script.id, script);
}

function toggleMenu(event: Event, row: any) {
  selectedRow.value = row;
  menu.value.toggle(event);
}

function deleteScript(scriptId: string) {
  scriptService.deleteScript(scriptId);
}

</script>

<template>
  <button @click="scriptStore.createScript('Test Script')">
    New Script
  </button>
  <DataTable
    :value="scriptStore.scripts"
    editMode="cell"
    tableStyle="min-width: 50rem"
  >
    <Column field="id" header="ID" />
    <Column field="name" header="Name">
      <template #body="{ data }">
        {{
            data.name
        }}
      </template>
      <template #editor="{ data, field }">
        <InputText 
          v-model="data[field]"
          placeholder="Set name"
        />
      </template>
    </Column>
    <Column field="inputIds" header="Inputs">
      <template #body="{ data }">
        <div v-for="(input, index) in data.inputIds" :key="index">
          <Select 
            v-model="data.inputIds[index]"
            :options="resourceService.getByType(['application', 'database'])"
            optionLabel="name"
            optionValue="id"
            placeholder="Select application"
            @change="updateInput(data)"
          />
          <button @click="removeInput(data.id, index)">-</button>
        </div>
        <div @click="addInput(data)">+</div>
      </template>
    </Column>
    <Column field="outputIds" header="Outputs">
      <template #body="{ data }">
        <div v-for="(input, index) in data.outputIds" :key="index">
          <Select 
            v-model="data.outputIds[index]"
            :options="resourceService.getByType(['application', 'fileLocation'])"
            optionLabel="name"
            optionValue="id"
            placeholder="Select application"
            @change="updateInput(data)"
          />
          <button @click="removeOutput(data.id, index)">-</button>
        </div>
        <div @click="addOutput(data)">+</div>
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