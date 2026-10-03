<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { Button, InputText, Menu, Select } from 'primevue'

import { onMounted, ref, type Ref } from 'vue';
import { useScriptStore, type Script } from '../stores/script.store';
import { useScriptService } from '../services/script.service';
import { useResourceService } from '../services/resources/resource.service';

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
  <div class="connection-table-toolbar">
    <span class="toolbar-hint">Click a name to edit it</span>
    <Button
      label="New script"
      icon="pi pi-plus"
      size="small"
      @click="scriptStore.createScript('Test Script')"
    />
  </div>
  <DataTable
    :value="scriptStore.scripts"
    editMode="cell"
    size="small"
    class="connection-table"
    tableStyle="min-width: 50rem"
  >
    <template #empty>
      <div class="table-empty">No scripts yet</div>
    </template>

    <Column field="id" header="ID">
      <template #body="{ data }">
        <span class="cell-id" :title="data.id">…{{ data.id.slice(-6) }}</span>
      </template>
    </Column>
    <Column field="name" header="Name">
      <template #body="{ data }">
        <span v-if="data.name" class="cell-resource">
          <i class="pi pi-code" />
          {{ data.name }}
        </span>
        <span v-else class="cell-empty">Set name</span>
      </template>
      <template #editor="{ data, field }">
        <InputText
          v-model="data[field]"
          placeholder="Set name"
          size="small"
        />
      </template>
    </Column>
    <Column field="inputIds" header="Inputs">
      <template #body="{ data }">
        <div class="resource-list">
          <div
            v-for="(_, index) in data.inputIds"
            :key="index"
            class="resource-list-item"
          >
            <Select
              v-model="data.inputIds[index]"
              :options="resourceService.getByType(['application', 'database'])"
              optionLabel="name"
              optionValue="id"
              placeholder="Select resource"
              size="small"
              class="resource-select"
              @change="updateInput(data)"
            />
            <Button
              icon="pi pi-times"
              text
              rounded
              size="small"
              severity="secondary"
              aria-label="Remove input"
              @click="removeInput(data.id, index)"
            />
          </div>
          <Button
            label="Add input"
            icon="pi pi-plus"
            text
            size="small"
            class="add-resource-button"
            @click="addInput(data)"
          />
        </div>
      </template>
    </Column>
    <Column field="outputIds" header="Outputs">
      <template #body="{ data }">
        <div class="resource-list">
          <div
            v-for="(_, index) in data.outputIds"
            :key="index"
            class="resource-list-item"
          >
            <Select
              v-model="data.outputIds[index]"
              :options="resourceService.getByType(['application', 'database', 'fileLocation'])"
              optionLabel="name"
              optionValue="id"
              placeholder="Select resource"
              size="small"
              class="resource-select"
              @change="updateInput(data)"
            />
            <Button
              icon="pi pi-times"
              text
              rounded
              size="small"
              severity="secondary"
              aria-label="Remove output"
              @click="removeOutput(data.id, index)"
            />
          </div>
          <Button
            label="Add output"
            icon="pi pi-plus"
            text
            size="small"
            class="add-resource-button"
            @click="addOutput(data)"
          />
        </div>
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

<style scoped>
.resource-list {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.resource-list-item {
  display: flex;
  align-items: center;
  gap: 2px;
}

.resource-select {
  min-width: 11rem;
}

.add-resource-button {
  padding-left: 4px;
  padding-right: 4px;
  font-size: 11px;
}
</style>