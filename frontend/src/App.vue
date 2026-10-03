<script setup lang="ts">
import { useAuthStore } from './stores/auth.store.ts';
import Login from './components/login/Login.vue';
import { onMounted } from 'vue';
import NavigationRail from './components/layout/NavigationRail.vue';

import Toast from 'primevue/toast';

const authStore = useAuthStore();

onMounted(() => {
  authStore.getProfile();
})

</script>

<template>
  <Toast />
  <div v-if="authStore.auth.isAuthenticated" class="app-shell">
    <NavigationRail />

    <main class="app-main">
      <!-- keep-alive keeps the architecture canvas mounted, so switching back keeps its viewport and data -->
      <RouterView v-slot="{ Component }">
        <KeepAlive include="ArchitectureView">
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
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
</style>
