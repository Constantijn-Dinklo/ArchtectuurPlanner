<script setup lang="ts">
import LeftSidebar from './components/layout/LeftSidebar.vue';
import CenterContent from "./components/layout/CenterContent.vue";
import RightSidebar from "./components/layout/RightSidebar.vue";
</script>

<template>

  <div class="app-layout">
    <div class="left-sidebar">
      <LeftSidebar />
    </div>
    <div class="center-content">
      <CenterContent />
    </div>
    <div class="right-sidebar">
      <RightSidebar />
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: grid;

  grid-template-columns:
    250px
    1fr
    250px;

  height: 100vh;
}

.left-sidebar {
  border-right: 1px solid #ddd;

  overflow: auto;
}

.center-content {
  overflow: hidden;
}

.right-sidebar {
  border-left: 1px solid #ddd;

  overflow: auto;
}
</style>
