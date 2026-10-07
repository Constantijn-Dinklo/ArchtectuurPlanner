
<script setup lang="ts">
    import { useSelectedEdgeProjection } from '../../projections/selectedEdge.projection.ts';
    import { useSelectedNodeProjection } from '../../projections/selectedNode.projection.ts';
    import ConnectionsDetail from '../ConnectionsDetail.vue';
    import ApplicationDetails from './ApplicationDetails.vue';
    import DatabaseDetails from './DatabaseDetails.vue';
    import ServerDetails from './ServerDetails.vue';
    import TableDetails from './TableDetails.vue';
    import ConnectionWarnings from './ConnectionWarnings.vue';
    import EndpointsSection from './EndpointsSection.vue';

    const selectedNodeProjection = useSelectedNodeProjection();
    const selectedEdgeProjection = useSelectedEdgeProjection();
</script>

<template>
    <div class="detail-panel">
        <template v-if="selectedNodeProjection.isNodeSelected() && selectedNodeProjection.nodeInfo.value">
            <ApplicationDetails v-if="selectedNodeProjection.nodeInfo.value.node.type === 'application'" />

            <DatabaseDetails v-else-if="selectedNodeProjection.nodeInfo.value.node.type === 'database'" />

            <ServerDetails v-else-if="selectedNodeProjection.nodeInfo.value.node.type === 'server'" />

            <TableDetails v-else-if="selectedNodeProjection.nodeInfo.value.node.type === 'table'" />

            <template v-else>
                <header class="detail-header">
                    <span class="detail-header-icon"><i class="pi pi-box" /></span>
                    <div class="detail-header-text">
                        <span class="detail-type-label">{{ selectedNodeProjection.nodeInfo.value.node.type }}</span>
                        <h2>{{ selectedNodeProjection.nodeInfo.value.node.name }}</h2>
                    </div>
                </header>
                <EndpointsSection
                    :resource-id="selectedNodeProjection.nodeInfo.value.node.id"
                    :resource-type="selectedNodeProjection.nodeInfo.value.node.type"
                />
                <ConnectionsDetail :connections-info="selectedNodeProjection.nodeInfo.value.connections" />
            </template>
        </template>

        <template v-if="selectedEdgeProjection.isEdgeSelected() && selectedEdgeProjection.connectionsInfo.value">
            <header class="detail-header">
                <span class="detail-header-icon"><i class="pi pi-arrow-right-arrow-left" /></span>
                <div class="detail-header-text">
                    <span class="detail-type-label">Connection</span>
                    <h2>
                        {{ selectedEdgeProjection.connectionsInfo.value.sourceName ?? '?' }}
                        →
                        {{ selectedEdgeProjection.connectionsInfo.value.targetName ?? '?' }}
                    </h2>
                </div>
            </header>
            <ConnectionWarnings :warnings="selectedEdgeProjection.connectionsInfo.value.warnings" />
            <ConnectionsDetail :connections-info="selectedEdgeProjection.connectionsInfo.value" />
        </template>

        <div
            v-if="!(selectedNodeProjection.isNodeSelected() && selectedNodeProjection.nodeInfo.value)
                && !(selectedEdgeProjection.isEdgeSelected() && selectedEdgeProjection.connectionsInfo.value)"
            class="detail-placeholder"
        >
            <i class="pi pi-mouse" />
            Select a node or connection on the canvas to see its details
        </div>
    </div>
</template>

<!-- Shared styling for the detail components (DatabaseDetails, TableDetails, ServerDetails, ConnectionsDetail) -->
<style>
.detail-panel {
    color: #1e293b;
    font-size: 12px;
}

.detail-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;

    margin: 24px 16px;
    padding: 24px 12px;

    border: 1px dashed #e2e8f0;
    border-radius: 10px;

    color: #94a3b8;
    font-size: 12px;
    text-align: center;
}

.detail-placeholder .pi {
    font-size: 18px;
}

/* Header */

.detail-header {
    display: flex;
    align-items: center;
    gap: 10px;

    padding: 14px 16px 12px;
}

.detail-header-icon {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;

    width: 32px;
    height: 32px;
    border-radius: 8px;

    background: #f1f5f9;
    color: #64748b;
    font-size: 14px;
}

.detail-header-icon.database { background: #ecfdf3; color: #22a35a; }
.detail-header-icon.table { background: #eef2ff; color: #6366f1; }
.detail-header-icon.server { background: #fefce8; color: #ca8a04; }

.detail-header-text {
    flex: 1;
    min-width: 0;
}

.detail-header h2 {
    margin: 1px 0 0;
    overflow: hidden;

    font-size: 15px;
    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.detail-type-label {
    color: #94a3b8;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

/* Sections */

.detail-section {
    margin: 0 12px 10px;
    padding: 10px 10px 8px;

    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #ffffff;
}

.detail-section-title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;

    color: #475569;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.detail-count {
    padding: 0 6px;
    border-radius: 999px;

    background: #f1f5f9;
    color: #64748b;
    font-size: 10px;
    letter-spacing: normal;
    line-height: 16px;
}

.detail-subtitle {
    margin: 6px 0 2px;

    color: #94a3b8;
    font-size: 11px;
    font-weight: 600;
}

/* Properties (label + value) */

.detail-property {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 30px;
}

.detail-property-label {
    width: 70px;
    flex: 0 0 auto;

    color: #64748b;
    font-size: 11px;
}

/* Rows */

.detail-row {
    display: flex;
    align-items: center;
    gap: 6px;

    min-height: 26px;
    padding: 0 2px 0 6px;
    border-radius: 6px;

    transition: background 0.1s ease;
}

.detail-row:hover {
    background: #f1f5f9;
}

.detail-row-icon {
    color: #94a3b8;
    font-size: 10px;
}

.detail-row-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;

    white-space: nowrap;
    text-overflow: ellipsis;
}

.detail-delete-button {
    flex: 0 0 auto;
    width: 20px;
    height: 20px;
    padding: 0;

    border: 0;
    border-radius: 5px;
    background: transparent;

    color: #94a3b8;
    font-size: 13px;
    line-height: 1;
    cursor: pointer;

    opacity: 0;
    transition: opacity 0.1s ease, background 0.1s ease, color 0.1s ease;
}

.detail-row:hover .detail-delete-button {
    opacity: 1;
}

.detail-delete-button:hover {
    background: #fee2e2;
    color: #dc2626;
}

.detail-empty {
    padding: 3px 6px;

    color: #94a3b8;
    font-size: 11px;
    font-style: italic;
}

/* Inputs */

.detail-input,
.detail-select {
    flex: 1;
    min-width: 0;
    height: 28px;
    box-sizing: border-box;
    padding: 0 8px;

    border: 1px solid #e2e8f0;
    border-radius: 6px;
    outline: none;
    background: #ffffff;

    color: #1e293b;
    font: inherit;

    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.detail-input:focus,
.detail-select:focus {
    border-color: #a5b4fc;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.detail-add-row {
    display: flex;
    gap: 4px;
    margin-top: 6px;
}

.detail-add-row .detail-input {
    border-style: dashed;
}

.detail-add-row .detail-input:focus {
    border-style: solid;
}

.detail-add-button {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;

    width: 28px;
    height: 28px;

    border: 0;
    border-radius: 6px;
    background: #4f46e5;

    color: #ffffff;
    font-size: 11px;
    cursor: pointer;
}

.detail-add-button:hover {
    background: #4338ca;
}

.detail-add-button:disabled {
    cursor: default;
    opacity: 0.4;
}

/* Compact PrimeVue select */

.detail-panel .detail-prime-select.p-select {
    width: 100%;
    height: 28px;
    margin-top: 6px;

    border: 1px dashed #e2e8f0;
    border-radius: 6px;
    box-shadow: none;
}

.detail-panel .detail-prime-select.p-select:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
}

.detail-panel .detail-prime-select .p-select-label {
    padding: 0 8px;

    color: #64748b;
    font-size: 12px;
    line-height: 26px;
}

.detail-panel .detail-prime-select .p-select-dropdown {
    width: 26px;
    color: #94a3b8;
}

.detail-panel .detail-prime-select .p-select-dropdown .p-icon {
    width: 10px;
    height: 10px;
}
</style>
