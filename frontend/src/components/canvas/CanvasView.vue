<script setup lang="ts">
import { ref } from "vue";

import { VueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";

import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";

import { useCanvasStore } from "../../stores/canvas.store";

const canvasStore = useCanvasStore();

// const { nodes, edges } = storeToRefs(canvasStore);

const nodes = ref([
  {
    id: "1",
    label: "Rectangle 1",
    position: { x: 100, y: 100 },
  },
  {
    id: "2",
    label: "Rectangle 2",
    position: { x: 400, y: 300 },
  },
]);

const edges = ref([
  {
    id: "e1-2",
    source: "1",
    target: "2",
  },
]);
</script>

<template>
  <div style="width: 100%; height: 100vh">
    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      fit-view-on-init
    >
      <Background />
    </VueFlow>
  </div>
</template>