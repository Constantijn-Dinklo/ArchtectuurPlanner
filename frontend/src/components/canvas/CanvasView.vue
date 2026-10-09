<script setup lang="ts">
import { Panel, VueFlow } from "@vue-flow/core";
import { useVueFlow } from '@vue-flow/core'
import { Background } from "@vue-flow/background";

import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";

import { markRaw, onMounted, watch } from "vue";
import { useViewStore } from "../../stores/canvas/view.store";
import { useCanvasProjection } from "../../projections/canvas.projection";
import { useUIStore } from "../../stores/canvas/ui.store";
import { useArchitectureViewService } from "../../services/architectureView.service";
import TableNode from "../nodes/TableNode.vue";
import ApplicationNode from "../nodes/ApplicationNode.vue";
import DatabaseNode from "../nodes/DatabaseNode.vue";
import ExternalNode from "../nodes/ExternalNode.vue";
import ConnectionEdge from "../edges/ConnectionEdge.vue";
import { useInformationRelationStore } from "../../stores/information/informationRelation.store";
import { useEndpointStore } from "../../stores/endpoint.store";
import { useApplicationStore } from "../../stores/resources/application.store";
import { useTableStore } from "../../stores/resources/table.store";

const viewStore = useViewStore();
const UIStore = useUIStore();
const architectureViewService = useArchitectureViewService();
const informationRelationStore = useInformationRelationStore();
const endpointStore = useEndpointStore();
const applicationStore = useApplicationStore();
const tableStore = useTableStore();

const { getNodes } = useVueFlow();
const nodeTypes = {
  application: markRaw(ApplicationNode),
  database: markRaw(DatabaseNode),
  table: markRaw(TableNode),
  external: markRaw(ExternalNode)
}
const edgeTypes = {
  connection: markRaw(ConnectionEdge)
}

const flowNodes = useCanvasProjection().flowNodes;
const flowEdges = useCanvasProjection().flowEdges;

onMounted(() => {
  viewStore.fetchViews();
  informationRelationStore.fetchInformationRelations();
  endpointStore.fetchEndpoints();
})

// The relations are changed in the backend whenever information is added to or removed from a resource
watch(
  () => [applicationStore.applications, tableStore.tables],
  () => informationRelationStore.fetchInformationRelations(),
  { deep: true }
);

function onNodeClick(event: any) {
  UIStore.setSelectedEntity(event.node.id, 'node');
}

function onNodeDragStop(event: any){
  const node = event.node;
  let newPosition = node.position;
  if(node.parentNode) {
    newPosition = {
      x: node.parentPosition.x + node.position.x,
      y: node.parentPosition.y + node.position.y
    }
  }
  viewStore.updateViewNodePosition(node.id, newPosition);

  for (const childNode of getNodes.value) {
    if(childNode.parentNode === node.id){
      viewStore.updateViewNodePosition(childNode.id, childNode.computedPosition)
    }
  }
}

function onEdgeClick(event: any) {
  UIStore.setSelectedEntity(event.edge.id, 'edge');
}

const { viewport } = useVueFlow()

watch(
  () => viewport.value.zoom,
  (newZoom, oldZoom) => {
    if(newZoom > 0.7) {
      architectureViewService.changeLevelOfDetail('database');
    }
    else if (newZoom < 0.7) {
      architectureViewService.changeLevelOfDetail('application');
    }
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
      :node-types="nodeTypes"
      :edge-types="edgeTypes"
      fit-view-on-init
      @node-click="onNodeClick"
      @node-drag-stop="onNodeDragStop"
      @edge-click="onEdgeClick"
    >
      <Background />

      <Panel position="top-left" class="search-panel">
        <input
          v-model="UIStore.informationFieldSearch"
          type="search"
          placeholder="Search information field"
        />
        <input
          v-model="UIStore.informationObjectSearch"
          type="search"
          placeholder="Search information object"
        />
      </Panel>
    </VueFlow>
  </div>
</template>

<style>

.vue-flow__node.server {
  background: yellow;
}

.search-panel {
  display: flex;
  gap: 6px;
}

.search-panel input {
  width: 190px;
  height: 29px;
  box-sizing: border-box;
  padding: 4px 7px;
  border: 1px solid var(--p-content-border-color);
  border-radius: 4px;
  background: var(--p-content-background);
  color: var(--p-text-color);
  font-size: 12px;
  outline: none;
}

.search-panel input:focus {
  border-color: var(--p-primary-color);
}

.vue-flow__node.search-match {
  outline: 2px solid var(--p-primary-color);
  outline-offset: 2px;
}

.vue-flow__node.search-dimmed {
  opacity: 0.3;
}

</style>