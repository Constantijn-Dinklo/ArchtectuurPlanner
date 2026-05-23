<script setup lang="ts">
import CanvasView from '../canvas/CanvasView.vue'
import ConnectionTable from '../ConnectionTable.vue'
</script>

<template>
    <div class="center-layout">
         <h1>Vue + Express + TypeScript</h1>
        <!-- <p>Backend status: {{ message }}</p> -->
        <CanvasView />
        <div class="table-area">
            <ConnectionTable />
        </div>
    </div>
</template>

<style lang="css" scoped>
.center-layout {
  display: grid;

  grid-template-rows:
    auto
    1fr
    300px;

  height: 100%;
  min-height: 0;
}

.table-area {
  overflow: auto;

  border-top: 1px solid #ddd;
}
</style>