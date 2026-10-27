<script setup lang="ts">
import { useAuthStore } from './stores/auth.store.ts';
import { useEnvironmentStore } from './stores/environment.store.ts';
import Login from './components/login/Login.vue';
import { onMounted, ref, watch } from 'vue';
import NavigationRail from './components/layout/NavigationRail.vue';

import Toast from 'primevue/toast';

const authStore = useAuthStore();
const environmentStore = useEnvironmentStore();

const environmentError = ref('');

onMounted(() => {
  authStore.getProfile();
})

// All architecture data belongs to an environment, so one is chosen before anything else is loaded
watch(
  () => authStore.auth.isAuthenticated,
  async (isAuthenticated) => {
    if (!isAuthenticated) return;
    try {
      environmentError.value = '';
      await environmentStore.fetchEnvironments();
    }
    catch (error: any) {
      environmentError.value = error.response?.data?.error ?? 'Could not load your environments';
    }
  },
  { immediate: true }
);

</script>

<template>
  <Toast />
  <div v-if="authStore.auth.isAuthenticated" class="app-shell">
    <NavigationRail />

    <main class="app-main">
      <!-- keep-alive keeps the architecture canvas mounted, so switching back keeps its viewport and data -->
      <RouterView v-if="environmentStore.currentEnvironment" v-slot="{ Component }">
        <KeepAlive include="ArchitectureView">
          <component :is="Component" />
        </KeepAlive>
      </RouterView>

      <div v-else class="app-loading">
        <template v-if="environmentError">
          <i class="pi pi-exclamation-triangle" />
          {{ environmentError }}
        </template>
        <template v-else>
          <i class="pi pi-spin pi-spinner" />
          Loading your environments…
        </template>
      </div>
    </main>
  </div>

  <div v-else>
    <Login />
  </div>
</template>

<style scoped>
/* The navigation rail is 52px wide and expands over the content, so the content starts after the collapsed rail */
.app-shell {
  position: relative;
  height: 100vh;
}

.app-main {
  height: 100%;
  margin-left: 52px;
}

.app-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  height: 100%;
  color: #64748b;
  font-size: 13px;
}
</style>
