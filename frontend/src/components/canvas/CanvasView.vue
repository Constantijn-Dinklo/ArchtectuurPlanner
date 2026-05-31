<script setup lang="ts">
import { VueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";

import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";

import { useCanvasStore } from "../../stores/canvas.store";
import { storeToRefs } from "pinia";
import { computed } from "vue";

const canvasStore = useCanvasStore();

const { nodes } = storeToRefs(canvasStore);
const allEdges = computed(() => canvasStore.allEdges);

</script>

<template>
  <div style="width: 100%; height: 100%">
    <VueFlow
      v-model:nodes="nodes"
      :edges="allEdges"
      fit-view-on-init
    >
      <Background />
    </VueFlow>
  </div>
</template>