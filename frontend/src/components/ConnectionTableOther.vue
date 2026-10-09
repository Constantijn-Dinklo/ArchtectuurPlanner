<script setup lang="ts">
import { ref } from 'vue';

import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { Select, Menu, Button, InputText } from 'primevue'

import {
  useOtherConnectionStore,
  OTHER_CONNECTION_METHODS,
  type OtherConnection,
  type OtherConnectionMethod
} from '../stores/otherConnection.store';
import { useResourceService } from '../services/resources/resource.service';
import { useSendableInformationService, type SendableField, type SendableObject } from '../services/sendableInformation.service';

const otherConnectionStore = useOtherConnectionStore();
const resourceService = useResourceService();
const sendableInformationService = useSendableInformationService();

const menu = ref();
const selectedRow = ref<OtherConnection>();

const menuItems = ref([
  {
    label: 'Delete',
    icon: 'pi pi-trash',
    command: () => {
      if (selectedRow.value) {
        otherConnectionStore.deleteOtherConnection(selectedRow.value.id);
      }
    }
  }
]);

// An other connection is the fallback for any transfer, so it can be between any resources
const resourceTypes = ['application', 'database', 'table', 'fileLocation', 'server', 'external'] as const;

function toggleMenu(event: Event, row: OtherConnection) {
  selectedRow.value = row;
  menu.value.toggle(event);
}

// Changing the source also clears the carried information, since it belonged to the old source
function updateSource(connection: OtherConnection, sourceId: string) {
  otherConnectionStore.updateOtherConnection(connection.id, { sourceId });
}

function updateTarget(connection: OtherConnection, targetId: string) {
  otherConnectionStore.updateOtherConnection(connection.id, { targetId });
}

function updateMethod(connection: OtherConnection, method: OtherConnectionMethod) {
  otherConnectionStore.updateOtherConnection(connection.id, { method });
}

function updateDescription(connection: OtherConnection) {
  otherConnectionStore.updateOtherConnection(connection.id, { description: connection.description });
}

// Only shows information that the source can still pass on
function getCarriedFields(connection: OtherConnection) {
  if (!connection.sourceId) return [];
  return sendableInformationService.getSendableFields(connection.sourceId)
    .filter(field => connection.informationFieldIds.includes(field.id));
}

function getCarriedObjects(connection: OtherConnection) {
  if (!connection.sourceId) return [];
  return sendableInformationService.getSendableObjects(connection.sourceId)
    .filter(informationObject => connection.informationObjectIds.includes(informationObject.id));
}
</script>

<template>
  <div class="connection-table-toolbar">
    <span class="toolbar-hint">Information goes from one resource to another by hand, through a send button, a file, an e-mail or in an unknown way</span>
    <Button
      label="Add connection"
      icon="pi pi-plus"
      size="small"
      @click="otherConnectionStore.createOtherConnection()"
    />
  </div>
  <DataTable
    :value="otherConnectionStore.otherConnections"
    size="small"
    class="connection-table"
    tableStyle="min-width: 50rem"
  >
    <template #empty>
      <div class="table-empty">No other connections yet</div>
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
          class="resource-select"
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
          class="resource-select"
          @update:model-value="(targetId: string) => updateTarget(data, targetId)"
        />
      </template>
    </Column>

    <Column field="method" header="Method">
      <template #body="{ data }">
        <Select
          :model-value="data.method"
          :options="OTHER_CONNECTION_METHODS"
          option-label="label"
          option-value="method"
          size="small"
          class="method-select"
          @update:model-value="(method: OtherConnectionMethod) => updateMethod(data, method)"
        >
          <template #value="{ value }">
            <span class="method-option">
              <i :class="OTHER_CONNECTION_METHODS.find(option => option.method === value)?.icon" />
              {{ OTHER_CONNECTION_METHODS.find(option => option.method === value)?.label }}
            </span>
          </template>
          <template #option="{ option }">
            <span class="method-option">
              <i :class="option.icon" />
              {{ option.label }}
            </span>
          </template>
        </Select>
      </template>
    </Column>

    <Column field="description" header="Description">
      <template #body="{ data }">
        <InputText
          v-model="data.description"
          placeholder="e.g. 'Send button in the HR module'"
          size="small"
          class="connection-description"
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
              @click="otherConnectionStore.removeInformationObject(data.id, informationObject.id)"
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
              @click="otherConnectionStore.removeInformationField(data.id, field.id)"
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
              @change="event => event.value && otherConnectionStore.addInformationObject(data.id, event.value.id)"
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
              @change="event => event.value && otherConnectionStore.addInformationField(data.id, event.value.id)"
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
.method-select {
  min-width: 9rem;
}

.method-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.method-option .pi {
  color: #64748b;
  font-size: 11px;
}

.resource-select {
  min-width: 10rem;
}

.connection-description {
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
