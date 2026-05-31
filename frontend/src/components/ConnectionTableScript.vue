<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { Button, InputText, Menu, Select } from 'primevue'

import { onMounted, ref, type Ref } from 'vue';
import { useScriptStore, type Script } from '../stores/script.store';
import { useApplicationStore } from '../stores/application.store';
import { useScriptService } from '../services/script.service';

const scriptStore = useScriptStore();
const scriptService = useScriptService();
const applicationStore = useApplicationStore();

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

function addOutput(script: Script) {
  scriptStore.addOutput(script.id);
}

function updateInput(script: Script) {
  console.log(script);
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
            :options="applicationStore.applications"
            optionLabel="name"
            optionValue="id"
            placeholder="Select application"
            @change="updateInput(data)"
          />
        </div>
        <div @click="addInput(data)">+</div>
      </template>
    </Column>
    <Column field="outputIds" header="Outputs">
      <template #body="{ data }">
        <div v-for="(input, index) in data.outputIds" :key="index">
          <Select 
            v-model="data.outputIds[index]"
            :options="applicationStore.applications"
            optionLabel="name"
            optionValue="id"
            placeholder="Select application"
            @change="updateInput(data)"
          />
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