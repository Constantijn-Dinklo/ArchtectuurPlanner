<script setup lang="ts">
import { ref } from 'vue';

import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { Select, Menu, Button, InputText } from 'primevue'

import { useHumanConnectionStore, type HumanConnection } from '../stores/humanConnection.store';
import { useResourceService } from '../services/resources/resource.service';
import { useSendableInformationService, type SendableField, type SendableObject } from '../services/sendableInformation.service';

const humanConnectionStore = useHumanConnectionStore();
const resourceService = useResourceService();
const sendableInformationService = useSendableInformationService();

const menu = ref();
const selectedRow = ref<HumanConnection>();

const menuItems = ref([
  {
    label: 'Delete',
    icon: 'pi pi-trash',
    command: () => {
      if (selectedRow.value) {
        humanConnectionStore.deleteHumanConnection(selectedRow.value.id);
      }
    }
  }
]);

// A person can copy information from and into any of these resources
const resourceTypes = ['application', 'database', 'table', 'fileLocation'] as const;

function toggleMenu(event: Event, row: HumanConnection) {
  selectedRow.value = row;
  menu.value.toggle(event);
}

// Changing the source also clears the carried information, since it belonged to the old source
function updateSource(connection: HumanConnection, sourceId: string) {
  humanConnectionStore.updateHumanConnection(connection.id, { sourceId });
}

function updateTarget(connection: HumanConnection, targetId: string) {
  humanConnectionStore.updateHumanConnection(connection.id, { targetId });
}

function updateDescription(connection: HumanConnection) {
  humanConnectionStore.updateHumanConnection(connection.id, { description: connection.description });
}

// Only shows information that the source can still pass on
function getCarriedFields(connection: HumanConnection) {
  if (!connection.sourceId) return [];
  return sendableInformationService.getSendableFields(connection.sourceId)
    .filter(field => connection.informationFieldIds.includes(field.id));
}

function getCarriedObjects(connection: HumanConnection) {
  if (!connection.sourceId) return [];
  return sendableInformationService.getSendableObjects(connection.sourceId)
    .filter(informationObject => connection.informationObjectIds.includes(informationObject.id));
}
</script>

<template>
  <div class="connection-table-toolbar">
    <span class="toolbar-hint">A person manually enters information from one resource into another</span>
    <Button
      label="Add human connection"
      icon="pi pi-plus"
      size="small"
      @click="humanConnectionStore.createHumanConnection()"
    />
  </div>
  <DataTable
    :value="humanConnectionStore.humanConnections"
    size="small"
    class="connection-table"
    tableStyle="min-width: 50rem"
  >
    <template #empty>
      <div class="table-empty">No human connections yet</div>
    </template>

    <Column field="id" header="ID">
      <template #body="{ data }">
        <span class="cell-id" :title="data.id">…{{ data.id.slice(-6) }}</span>
      </template>
    </Column>

    <Column field="sourceId" header="From">
      <template #body="{ data }">
        <Select
          :model-value="data.sourceId"
          :options="resourceService.getByType([...resourceTypes]).filter(resource => resource.id !== data.targetId)"
          option-label="name"
          option-value="id"
          placeholder="Select resource"
          filter
          size="small"
          class="human-select"
          @update:model-value="(sourceId: string) => updateSource(data, sourceId)"
        />
      </template>
    </Column>

    <Column field="targetId" header="To">
      <template #body="{ data }">
        <Select
          :model-value="data.targetId"
          :options="resourceService.getByType([...resourceTypes]).filter(resource => resource.id !== data.sourceId)"
          option-label="name"
          option-value="id"
          placeholder="Select resource"
          filter
          size="small"
          class="human-select"
          @update:model-value="(targetId: string) => updateTarget(data, targetId)"
        />
      </template>
    </Column>

    <Column field="description" header="Description">
      <template #body="{ data }">
        <InputText
          v-model="data.description"
          placeholder="Who enters what, e.g. 'Sales copies orders'"
          size="small"
          class="human-description"
          @change="updateDescription(data)"
        />
      </template>
    </Column>

    <Column header="Information">
      <template #body="{ data }">
        <div class="carried-information">
          <span
            v-for="informationObject in getCarriedObjects(data)"
            :key="informationObject.id"
            class="carried-chip object"
          >
            ▱ {{ informationObject.objectName }}
            <button
              type="button"
              title="Stop carrying this object over"
              @click="humanConnectionStore.removeInformationObject(data.id, informationObject.id)"
            >
              ×
            </button>
          </span>

          <span
            v-for="field in getCarriedFields(data)"
            :key="field.id"
            class="carried-chip"
            :title="field.objectNames.length ? `Part of ${field.objectNames.join(', ')}` : undefined"
          >
            {{ field.fieldName }}
            <button
              type="button"
              title="Stop carrying this field over"
              @click="humanConnectionStore.removeInformationField(data.id, field.id)"
            >
              ×
            </button>
          </span>

          <template v-if="data.sourceId">
            <Select
              v-if="sendableInformationService.getSendableObjects(data.sourceId).length"
              :model-value="undefined"
              :options="sendableInformationService.getSendableObjects(data.sourceId)"
              option-label="objectName"
              :option-disabled="(informationObject: SendableObject) => data.informationObjectIds.includes(informationObject.id)"
              placeholder="+ Object"
              filter
              filter-placeholder="Search object"
              size="small"
              class="carried-select"
              @change="event => event.value && humanConnectionStore.addInformationObject(data.id, event.value.id)"
            />
            <Select
              :model-value="undefined"
              :options="sendableInformationService.getSendableFields(data.sourceId)"
              option-label="label"
              :option-disabled="(field: SendableField) => data.informationFieldIds.includes(field.id)"
              placeholder="+ Field"
              filter
              filter-placeholder="Search field"
              empty-message="The source has no information to pass on"
              size="small"
              class="carried-select"
              @change="event => event.value && humanConnectionStore.addInformationField(data.id, event.value.id)"
            />
          </template>
          <span v-else class="cell-empty">Select a source first</span>
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
.human-select {
  min-width: 10rem;
}

.human-description {
  width: 100%;
  min-width: 12rem;
  font-size: 12px;
}

.carried-information {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.carried-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;

  padding: 1px 3px 1px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;

  background: #ffffff;
  font-size: 11px;
}

.carried-chip.object {
  border-color: #c7d2fe;
  background: #eef2ff;
  color: #3730a3;
}

.carried-chip button {
  width: 16px;
  height: 16px;
  padding: 0;

  border: 0;
  border-radius: 50%;
  background: transparent;

  color: #94a3b8;
  cursor: pointer;
}

.carried-chip button:hover {
  background: #fee2e2;
  color: #dc2626;
}

.carried-select {
  min-width: 6.5rem;
  font-size: 11px;
}
</style>
