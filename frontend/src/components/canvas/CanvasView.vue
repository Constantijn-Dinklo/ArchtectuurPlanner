<script setup lang="ts">
import { VueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";

import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";

import { useCanvasStore } from "../../stores/canvas/canvas.store";
import { computed, onMounted } from "vue";
import { useViewStore } from "../../stores/canvas/view.store";
import { useCanvasProjection } from "../../projections/canvas.projection";

const viewStore = useViewStore();
const canvasStore = useCanvasStore();


const flowNodes = useCanvasProjection().flowNodes;
const allEdges = computed(() => canvasStore.allEdges);

onMounted(() => {
  viewStore.fetchViews();
})

function onNodeDragStop(event: any){
  const node = event.node;
  viewStore.updateViewNodePosition(node.id, node.position);
}

</script>

<template>
  <div style="width: 100%; height: 100%">
    <VueFlow
      :nodes="flowNodes"
      :edges="allEdges"
      fit-view-on-init
      @node-drag-stop="onNodeDragStop"
    >
      <Background />
    </VueFlow>
  </div>
</template>

<style>

.vue-flow__node.application {
  background: white;
}

.vue-flow__node.database {
  background: #22c55e;
}

</style>