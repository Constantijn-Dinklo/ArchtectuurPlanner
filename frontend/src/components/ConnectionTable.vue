<script setup lang="ts">
  import { onMounted, ref } from 'vue';
  import ConnectionTableApi from './ConnectionTableApi.vue';
  import ConnectionTableScript from './ConnectionTableScript.vue';
  import { useApiConnectionService } from '../services/apiConnection.service.ts';
  import { useScriptService } from '../services/script.service.ts';
  import ConnectionTableDatabase from './ConnectionTableDatabase.vue';
  import { useDatabaseConnectionStore } from '../stores/databaseConnection.store.ts';
  import { useApiConnectionStore } from '../stores/apiConnection.store.ts';
  import { useScriptStore } from '../stores/script.store.ts';
  import ConnectionTableOther from './ConnectionTableOther.vue';
  import { useOtherConnectionStore } from '../stores/otherConnection.store.ts';

  const apiConnectionService = useApiConnectionService();
  const apiConnectionStore = useApiConnectionStore();
  const databaseConnectionStore = useDatabaseConnectionStore();
  const scriptService = useScriptService();
  const scriptStore = useScriptStore();
  const otherConnectionStore = useOtherConnectionStore();

  const activeTable = ref<'api' | 'script' | 'database' | 'other'>('api');

  onMounted(() => {
    apiConnectionService.fetchApiConnections();
    databaseConnectionStore.fetchDatabaseConnections();
    scriptService.fetchScripts();
    otherConnectionStore.fetchOtherConnections();
  });

</script>

<template>
  <div class="connection-panel">
    <div class="table-toggle">
      <button
        :class="{ active: activeTable === 'api' }"
        @click="activeTable = 'api'"
      >
        <i class="pi pi-link" />
        Api
        <span class="toggle-count">{{ apiConnectionStore.apiConnections.length }}</span>
      </button>

      <button
        :class="{ active: activeTable === 'script' }"
        @click="activeTable = 'script'"
      >
        <i class="pi pi-code" />
        Scripts
        <span class="toggle-count">{{ scriptStore.scripts.length }}</span>
      </button>

      <button
        :class="{ active: activeTable === 'database' }"
        @click="activeTable = 'database'"
      >
        <i class="pi pi-database" />
        Database Connections
        <span class="toggle-count">{{ databaseConnectionStore.databaseConnections.length }}</span>
      </button>

      <button
        :class="{ active: activeTable === 'other' }"
        @click="activeTable = 'other'"
      >
        <i class="pi pi-share-alt" />
        Other
        <span class="toggle-count">{{ otherConnectionStore.otherConnections.length }}</span>
      </button>
    </div>

    <div class="table-container">
      <ConnectionTableApi v-if="activeTable === 'api'" />

      <ConnectionTableScript v-else-if="activeTable === 'script'" />

      <ConnectionTableDatabase v-else-if="activeTable === 'database'" />

      <ConnectionTableOther v-else />
    </div>
  </div>
</template>

<style scoped>
  .connection-panel {
    padding: 0 14px 12px;
  }

  .table-toggle {
    display: inline-flex;
    gap: 2px;
    margin-bottom: 10px;
    padding: 3px;

    border-radius: 8px;
    background: #f1f5f9;
  }

  .table-toggle button {
    display: inline-flex;
    align-items: center;
    gap: 6px;

    padding: 5px 12px;
    border: 0;
    border-radius: 6px;
    background: transparent;

    color: #64748b;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;

    transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
  }

  .table-toggle button:hover {
    color: #1e293b;
  }

  .table-toggle button.active {
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.1);
    color: #1e293b;
  }

  .table-toggle .pi {
    font-size: 11px;
  }

  .toggle-count {
    padding: 0 6px;
    border-radius: 999px;

    background: #e2e8f0;
    color: #475569;
    font-size: 10px;
    font-weight: 600;
    line-height: 16px;
  }

  .table-toggle button.active .toggle-count {
    background: #e0e7ff;
    color: #4f46e5;
  }
</style>

<!-- Shared styling for the three connection tables -->
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
