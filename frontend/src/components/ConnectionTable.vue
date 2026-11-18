<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue';
  import DataTable from 'primevue/datatable';
  import Column from 'primevue/column';
  import { Select, Menu, Button, InputText } from 'primevue';

  import { useConnectionStore } from '../stores/connection.store';
  import { useApiStore } from '../stores/api.store';
  import { useResourceService } from '../services/resources/resource.service';
  import { RESOURCE_ICONS } from '../types/resource.type';
  import { CONNECTION_KINDS, getConnectionKindInfo, type Connection, type ConnectionKind, type PartType } from '../types/connection.types';

  // Every connection between two resources, in one table. A connection always has both ends, so a new one is made
  // with the row at the top. Its ends never change: how it goes (the kind) and the description can
  const connectionStore = useConnectionStore();
  const apiStore = useApiStore();
  const resourceService = useResourceService();

  onMounted(() => connectionStore.fetchConnections());

  // Resources that can be connected. A table is reached through its database
  const resourceOptions = computed(() =>
    resourceService.getByType(['application', 'external', 'database', 'fileLocation'])
      .map(resource => ({ id: resource.id, type: resource.type as PartType, label: resource.name }))
      .sort((a, b) => a.label.localeCompare(b.label))
  );

  function getName(partId: string) {
    return resourceService.getResource(partId)?.name ?? '?';
  }

  function getIcon(partId: string) {
    const resource = resourceService.getResource(partId);
    return resource ? RESOURCE_ICONS[resource.type] : 'pi pi-box';
  }

  // <-- A new connection -->
  const newSourceId = ref<string>();
  const newTargetId = ref<string>();
  const newKind = ref<ConnectionKind>('undecided');
  const newApiId = ref<string>();

  // The kind starts as what fits the two ends: with a database or file location the way is known, between applications
  // and external elements it can stay undecided
  watch([newSourceId, newTargetId], ([sourceId, targetId]) => {
    const types = [sourceId, targetId].map(id => id ? resourceService.getResource(id)?.type : undefined);
    newKind.value = types.includes('database') ? 'database' : types.includes('fileLocation') ? 'file' : 'undecided';
  });

  const newSourceApis = computed(() => newSourceId.value ? apiStore.getApplicationApis(newSourceId.value) : []);
  const canAdd = computed(() =>
    !!newSourceId.value && !!newTargetId.value && newSourceId.value !== newTargetId.value &&
    (newKind.value !== 'api' || !!newApiId.value)
  );

  function toPart(partId: string) {
    const option = resourceOptions.value.find(option => option.id === partId)!;
    return { id: option.id, type: option.type };
  }

  async function addConnection() {
    if (!canAdd.value) return;
    const ends = { source: toPart(newSourceId.value!), target: toPart(newTargetId.value!) };
    const created = newKind.value === 'api'
      ? await connectionStore.createConnection({ ...ends, kind: 'api', apiId: newApiId.value! })
      : await connectionStore.createConnection({ ...ends, kind: newKind.value as Exclude<ConnectionKind, 'api'> });
    if (created) {
      newSourceId.value = undefined;
      newTargetId.value = undefined;
      newKind.value = 'undecided';
      newApiId.value = undefined;
    }
  }

  // <-- Changing a connection -->
  // A connection that is changed to an api first needs its api
  const choosingApiFor = ref<string>();

  function changeKind(connection: Connection, kind: ConnectionKind) {
    if (kind === 'api') {
      choosingApiFor.value = connection.id;
      return;
    }
    choosingApiFor.value = undefined;
    connectionStore.updateConnection(connection.id, { kind });
  }

  function changeApi(connection: Connection, apiId: string) {
    choosingApiFor.value = undefined;
    connectionStore.updateConnection(connection.id, { kind: 'api', apiId });
  }

  function changeDescription(connection: Connection, description: string) {
    if (description !== connection.description) connectionStore.updateConnection(connection.id, { description });
  }

  // Deleting a connection also removes everything that goes through it
  const menu = ref();
  const selectedRow = ref<Connection>();
  const menuItems = ref([
    {
      label: 'Delete, with what goes through it',
      icon: 'pi pi-trash',
      command: () => {
        if (selectedRow.value) connectionStore.deleteConnection(selectedRow.value.id);
      }
    }
  ]);

  function toggleMenu(event: Event, row: Connection) {
    selectedRow.value = row;
    menu.value.toggle(event);
  }
</script>

<template>
  <div class="connection-panel">
    <div class="new-connection">
      <Select
        v-model="newSourceId"
        :options="resourceOptions"
        option-label="label"
        option-value="id"
        placeholder="From"
        filter
        size="small"
        class="new-connection-select"
      />
      <i class="pi pi-arrow-right new-connection-arrow" />
      <Select
        v-model="newTargetId"
        :options="resourceOptions.filter(option => option.id !== newSourceId)"
        option-label="label"
        option-value="id"
        placeholder="To"
        filter
        size="small"
        class="new-connection-select"
      />
      <Select
        v-model="newKind"
        :options="CONNECTION_KINDS"
        option-label="label"
        option-value="kind"
        size="small"
        class="new-connection-kind"
      />
      <Select
        v-if="newKind === 'api'"
        v-model="newApiId"
        :options="newSourceApis"
        option-label="url"
        option-value="id"
        :placeholder="newSourceId ? 'Choose the API' : 'Choose From first'"
        :empty-message="newSourceId ? 'The source has no APIs' : 'Choose From first'"
        size="small"
        class="new-connection-select"
      />
      <Button
        label="Add connection"
        icon="pi pi-plus"
        size="small"
        :disabled="!canAdd"
        @click="addConnection"
      />
    </div>

    <DataTable
      :value="connectionStore.connections"
      size="small"
      class="connection-table"
      table-style="min-width: 50rem"
    >
      <template #empty>
        <div class="table-empty">No connections yet</div>
      </template>

      <Column header="From">
        <template #body="{ data }">
          <span class="cell-resource">
            <i :class="getIcon(data.source.id)" />
            {{ getName(data.source.id) }}
          </span>
        </template>
      </Column>

      <Column header="To">
        <template #body="{ data }">
          <span class="cell-resource">
            <i :class="getIcon(data.target.id)" />
            {{ getName(data.target.id) }}
          </span>
        </template>
      </Column>

      <Column header="How">
        <template #body="{ data }">
          <div class="cell-kind">
            <select
              class="detail-select kind-select"
              :class="{ unknown: data.kind === 'unknown' }"
              :value="choosingApiFor === data.id ? 'api' : data.kind"
              @change="changeKind(data, ($event.target as HTMLSelectElement).value as ConnectionKind)"
            >
              <option v-for="option in CONNECTION_KINDS" :key="option.kind" :value="option.kind">
                {{ option.label }}
              </option>
            </select>
            <select
              v-if="data.kind === 'api' || choosingApiFor === data.id"
              class="detail-select kind-select"
              :class="{ unknown: data.kind !== 'api' }"
              :value="data.kind === 'api' ? data.apiId : ''"
              @change="changeApi(data, ($event.target as HTMLSelectElement).value)"
            >
              <option value="" disabled>
                {{ apiStore.getApplicationApis(data.source.id).length ? 'Choose the API' : 'The source has no APIs' }}
              </option>
              <option v-for="api in apiStore.getApplicationApis(data.source.id)" :key="api.id" :value="api.id">
                {{ api.url }}
              </option>
            </select>
            <i
              v-if="data.kind === 'unknown'"
              class="pi pi-exclamation-triangle unknown-icon"
              :title="`Not known yet how this goes: ${getConnectionKindInfo(data.kind).label.toLowerCase()}`"
            />
          </div>
        </template>
      </Column>

      <Column header="Description">
        <template #body="{ data }">
          <InputText
            :model-value="data.description"
            size="small"
            class="description-input"
            placeholder="e.g. weekly export"
            @change="changeDescription(data, ($event.target as HTMLInputElement).value)"
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
  </div>
</template>

<style scoped>
  .connection-panel {
    padding: 0 14px 12px;
  }

  .new-connection {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .new-connection-select {
    min-width: 11rem;
  }

  .new-connection-kind {
    min-width: 8rem;
  }

  .new-connection-arrow {
    color: #94a3b8;
    font-size: 11px;
  }

  .cell-kind {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .kind-select {
    width: auto;
    min-width: 7rem;
  }

  /* Nobody knows yet how it goes */
  .kind-select.unknown {
    border-color: #fcd34d;
    background: #fffbeb;
    color: #b45309;
  }

  .unknown-icon {
    color: #d97706;
    font-size: 11px;
  }

  .description-input {
    width: 100%;
    font-size: 12px;
  }
</style>

<!-- Styling of the connection table, unscoped so it reaches inside the PrimeVue table -->
<style>
  .connection-table-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .connection-table-toolbar .toolbar-hint {
    color: #94a3b8;
    font-size: 11px;
  }

  .connection-table {
    overflow: hidden;

    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 12px;
  }

  .connection-table .p-datatable-thead > tr > th {
    padding: 7px 12px;

    border-color: #e2e8f0;
    background: #f8fafc;

    color: #64748b;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .connection-table .p-datatable-tbody > tr > td {
    padding: 6px 12px;
    border-color: #f1f5f9;
  }

  .connection-table .p-datatable-tbody > tr {
    transition: background 0.1s ease;
  }

  .connection-table .p-datatable-tbody > tr:hover {
    background: #f8fafc;
  }

  .connection-table .p-datatable-tbody > tr:last-child > td {
    border-bottom: 0;
  }

  .connection-table .cell-id {
    color: #94a3b8;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 10px;
  }

  .connection-table .cell-resource {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .connection-table .cell-resource .pi {
    color: #94a3b8;
    font-size: 11px;
  }

  .connection-table .cell-empty {
    color: #cbd5e1;
    font-style: italic;
  }

  .connection-table .cell-warning {
    display: inline-flex;
    align-items: center;
    gap: 5px;

    padding: 1px 8px;
    border: 1px solid #fcd34d;
    border-radius: 999px;
    background: #fffbeb;

    color: #b45309;
    font-size: 11px;
    font-weight: 500;
  }

  .connection-table .cell-warning .pi {
    color: #d97706;
    font-size: 10px;
  }

  .connection-table .table-empty {
    padding: 14px 0;
    color: #94a3b8;
    text-align: center;
  }
</style>
