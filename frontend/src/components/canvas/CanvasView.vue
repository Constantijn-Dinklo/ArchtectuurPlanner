<script setup lang="ts">
import { VueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";

import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";

import { useCanvasStore } from "../../stores/canvas.store";
import { storeToRefs } from "pinia";

const canvasStore = useCanvasStore();

const { nodes, edges } = storeToRefs(canvasStore);
</script>

<template>
  <div style="width: 100%; height: 100%">
    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      fit-view-on-init
    >
      <Background />
    </VueFlow>
  </div>
</template>