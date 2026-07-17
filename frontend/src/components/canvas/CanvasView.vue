<script setup lang="ts">
import { VueFlow } from "@vue-flow/core";
import { useVueFlow } from '@vue-flow/core'
import { Background } from "@vue-flow/background";

import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";

import { onMounted, watch } from "vue";
import { useViewStore } from "../../stores/canvas/view.store";
import { useCanvasProjection } from "../../projections/canvas.projection";
import { useUIStore } from "../../stores/canvas/ui.store";

const viewStore = useViewStore();
const UIStore = useUIStore();

const flowNodes = useCanvasProjection().flowNodes;
const flowEdges = useCanvasProjection().flowEdges;

onMounted(() => {
  viewStore.fetchViews();
})

function onNodeClick(event: any) {
  UIStore.setSelectedEntity(event.node.id, 'node');
}

function onNodeDragStop(event: any){
  const node = event.node;
  viewStore.updateViewNodePosition(node.id, node.position);
}

function onEdgeClick(event: any) {
  UIStore.setSelectedEntity(event.edge.id, 'edge');
}

const { viewport } = useVueFlow()

watch(
  () => viewport.value.zoom,
  (newZoom, oldZoom) => {
    console.log(`Zoom ${oldZoom} -> ${newZoom}`)
  }
)

</script>

<template>
  <div style="width: 100%; height: 100%">
    <VueFlow
      :min-zoom="0.01"
      :max-zoom="200"
      :nodes="flowNodes"
      :edges="flowEdges"
      fit-view-on-init
      @node-click="onNodeClick"
      @node-drag-stop="onNodeDragStop"
      @edge-click="onEdgeClick"
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

.vue-flow__node.server {
  background: yellow;
}

</style>