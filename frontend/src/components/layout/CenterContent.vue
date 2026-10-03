<script setup lang="ts">
import { ref } from 'vue'
import CanvasView from '../canvas/CanvasView.vue'
import ConnectionTable from '../ConnectionTable.vue'
import InformationRelationChains from '../InformationRelationChains.vue'

const activeSheet = ref<'connections' | 'information'>('connections');
</script>

<template>
    <div class="center-layout">
         <h1>Vue + Express + TypeScript</h1>
        <!-- <p>Backend status: {{ message }}</p> -->
        <CanvasView />
        <div class="table-area">
            <div class="sheet-toggle">
                <button
                    @click="activeSheet = 'connections'"
                    :class="{ active: activeSheet === 'connections' }"
                >
                    <i class="pi pi-share-alt" />
                    Connections
                </button>

                <button
                    @click="activeSheet = 'information'"
                    :class="{ active: activeSheet === 'information' }"
                >
                    <i class="pi pi-sitemap" />
                    Information
                </button>
            </div>

            <!-- v-show keeps the ConnectionTable mounted, so it does not refetch when switching back -->
            <div v-show="activeSheet === 'connections'">
                <ConnectionTable />
            </div>

            <InformationRelationChains v-if="activeSheet === 'information'" />
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

  border-top: 1px solid #e2e8f0;
  background: #ffffff;
}

.sheet-toggle {
  position: sticky;
  top: 0;
  z-index: 1;

  display: flex;
  gap: 4px;

  margin-bottom: 10px;
  padding: 0 14px;

  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}

.sheet-toggle button {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  margin-bottom: -1px;
  padding: 9px 10px 8px;

  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;

  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  transition: color 0.15s ease, border-color 0.15s ease;
}

.sheet-toggle button:hover {
  color: #1e293b;
}

.sheet-toggle button.active {
  border-bottom-color: #4f46e5;
  color: #1e293b;
}

.sheet-toggle .pi {
  font-size: 11px;
}
</style>
