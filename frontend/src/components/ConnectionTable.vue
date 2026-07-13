<script setup lang="ts">
  import { onMounted, ref } from 'vue';
  import ConnectionTableApi from './ConnectionTableApi.vue';
  import ConnectionTableScript from './ConnectionTableScript.vue';
  import { useApiConnectionService } from '../services/apiConnection.service.ts';
  import { useScriptService } from '../services/script.service.ts';
  import ConnectionTableDatabase from './ConnectionTableDatabase.vue';
  import { useDatabaseConnectionStore } from '../stores/databaseConnection.store.ts';

  const apiConnectionService = useApiConnectionService();
  const databaseConnectionStore = useDatabaseConnectionStore();
  const scriptService = useScriptService();

  const activeTable = ref<'api' | 'script' | 'database'>('api');

  onMounted(() => {
    apiConnectionService.fetchApiConnections();
    databaseConnectionStore.fetchDatabaseConnections();
    scriptService.fetchScripts();
  });

</script>

<template>
  <div class="table-toggle">
    <button
      @click="activeTable = 'api'"
      :class="{ active: activeTable === 'api' }"
    >
      Api
    </button>

    <button
      @click="activeTable = 'script'"
      :class="{ active: activeTable === 'script' }"
    >
      Scripts
    </button>
    <button
      @click="activeTable = 'database'"
      :class="{ active: activeTable === 'database' }"
    >
      Database Connections
    </button>
  </div>
  <div class="table-container">
    <ConnectionTableApi v-if="activeTable === 'api'" />

    <ConnectionTableScript v-else-if="activeTable === 'script'" />

    <ConnectionTableDatabase v-else/>
  </div>
</template>

<style>
  .table-toggle {
    display: flex;
    gap: 8px;
  }

  button.active {
    font-weight: bold;
    border-bottom: 2px solid black;
  }
</style>