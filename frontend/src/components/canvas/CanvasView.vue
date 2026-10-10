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
import type { LevelOfDetail } from "../../types/levelOfDetail";
import { useArchitectureViewService } from "../../services/architectureView.service";
import TableNode from "../nodes/TableNode.vue";
import ApplicationNode from "../nodes/ApplicationNode.vue";
import DatabaseNode from "../nodes/DatabaseNode.vue";
import ExternalNode from "../nodes/ExternalNode.vue";
import FileLocationNode from "../nodes/FileLocationNode.vue";
import ConnectionEdge from "../edges/ConnectionEdge.vue";
import { useInformationRelationStore } from "../../stores/information/informationRelation.store";
import { useEndpointStore } from "../../stores/endpoint.store";
import { useApplicationStore } from "../../stores/resources/application.store";
import { useTableStore } from "../../stores/resources/table.store";
import { useDatabaseStore } from "../../stores/resources/database.store";
import { useFileLocationStore } from "../../stores/resources/fileLocation.store";
import { useServerStore } from "../../stores/resources/server.store";
import { useExternalStore } from "../../stores/resources/external.store";

const viewStore = useViewStore();
const UIStore = useUIStore();
const architectureViewService = useArchitectureViewService();
const informationRelationStore = useInformationRelationStore();
const endpointStore = useEndpointStore();
const applicationStore = useApplicationStore();
const tableStore = useTableStore();
const databaseStore = useDatabaseStore();
const fileLocationStore = useFileLocationStore();
const serverStore = useServerStore();
const externalStore = useExternalStore();

const { getNodes } = useVueFlow();
const nodeTypes = {
  application: markRaw(ApplicationNode),
  database: markRaw(DatabaseNode),
  table: markRaw(TableNode),
  external: markRaw(ExternalNode),
  fileLocation: markRaw(FileLocationNode)
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

// The relations are changed in the backend whenever information is added to or removed from a resource,
// and when a resource is removed (its relations are removed with it)
watch(
  () => [
    applicationStore.applications,
    tableStore.tables,
    databaseStore.databases.length,
    fileLocationStore.fileLocations.length,
    serverStore.servers.length,
    externalStore.externals.length
  ],
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

// Zooming in past these levels switches to the next level of detail:
// application -> database -> detail (which also shows the endpoints of applications)
const DATABASE_LEVEL_ZOOM = 0.85;
const DETAIL_LEVEL_ZOOM = 1.6;

function getLevelOfDetailForZoom(zoom: number): LevelOfDetail {
  if (zoom >= DETAIL_LEVEL_ZOOM) return 'detail';
  if (zoom >= DATABASE_LEVEL_ZOOM) return 'database';
  return 'application';
}

watch(
  () => viewport.value.zoom,
  (newZoom) => {
    // Only switch (and load the data of the level) when the level actually changes, not on every zoom step
    const level = getLevelOfDetailForZoom(newZoom);
    if(level !== UIStore.levelOfDetail) {
      architectureViewService.changeLevelOfDetail(level);
    }
  }
)

</script>

<template>
  <div
    class="canvas-wrapper"
    :class="`canvas-lod-${UIStore.levelOfDetail}`"
  >
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

.canvas-wrapper {
  width: 100%;
  height: 100%;
}

/* Application level of detail: bigger nodes with bigger text, since only names are shown */

.canvas-lod-application .vue-flow__node-application {
  display: flex;
}

.canvas-lod-application .vue-flow__node-application .application-node {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
}

.canvas-lod-application .vue-flow__node-application .application-header {
  gap: 8px;
  font-size: 16px;
}

.canvas-lod-application .vue-flow__node-database .database-node {
  display: flex;
  align-items: center;
}

.canvas-lod-application .vue-flow__node-database .database-header {
  flex: 1;
  height: 100%;
  font-size: 16px;
}

.canvas-lod-application .vue-flow__node-database .database-icon {
  width: 20px;
  height: 20px;
}

.canvas-lod-application .vue-flow__node-database .engine-badge,
.canvas-lod-application .vue-flow__node-database .table-count {
  font-size: 12px;
}

/* External elements and file locations look like the application node: a centred icon and name.
   Their border, colours and icon still show what kind of resource they are */
.canvas-lod-application .vue-flow__node-external,
.canvas-lod-application .vue-flow__node-fileLocation {
  display: flex;
}

.canvas-lod-application .vue-flow__node-external .external-node,
.canvas-lod-application .vue-flow__node-fileLocation .file-location-node {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
}

.canvas-lod-application .vue-flow__node-external .external-header,
.canvas-lod-application .vue-flow__node-fileLocation .file-location-node {
  gap: 8px;
  padding: 0 10px;
}

.canvas-lod-application .vue-flow__node-external .external-title,
.canvas-lod-application .vue-flow__node-fileLocation .file-location-text {
  flex: 0 1 auto;
}

.canvas-lod-application .vue-flow__node-external .external-name,
.canvas-lod-application .vue-flow__node-fileLocation .file-location-name {
  font-size: 16px;
}

/* The icon sits right next to the name, without a box around it, like on the application node */
.canvas-lod-application .vue-flow__node-external .external-header,
.canvas-lod-application .vue-flow__node-fileLocation .file-location-node {
  font-size: 16px;
}

.canvas-lod-application .vue-flow__node-external .external-icon,
.canvas-lod-application .vue-flow__node-fileLocation .file-location-icon {
  width: 1.1em;
  height: 1.1em;
  border-radius: 0;
  background: transparent;
}

.canvas-lod-application .vue-flow__node-external .external-icon .pi {
  font-size: 1em;
}

.canvas-lod-application .vue-flow__node-fileLocation .file-location-icon svg {
  width: 100%;
  height: 100%;
}

.canvas-lod-application .vue-flow__node-external .external-badge,
.canvas-lod-application .vue-flow__node-external .external-organisation,
.canvas-lod-application .vue-flow__node-fileLocation .file-location-badge,
.canvas-lod-application .vue-flow__node-fileLocation .file-location-count {
  display: none;
}

.canvas-lod-application .vue-flow__node-default {
  font-size: 15px;
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

/* Detail level of detail: the focus is on what is inside the resources, so the connections fade
   in the same way as the nodes that do not match a search. Hovering or selecting a connection shows it again */
.vue-flow__edge {
  transition: opacity 0.15s ease;
}

.canvas-lod-detail .vue-flow__edge {
  opacity: 0.3;
}

.canvas-lod-detail .vue-flow__edge:hover,
.canvas-lod-detail .vue-flow__edge.selected {
  opacity: 1;
}

</style>