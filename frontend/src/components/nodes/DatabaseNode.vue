<script setup lang="ts">
    import { ref } from 'vue';
    import { Handle, Position, type NodeProps } from '@vue-flow/core';
    import { useTableService } from '../../services/resources/table.service';
    import { useUIStore } from '../../stores/canvas/ui.store';

    interface DatabaseNodeData {
        label: string;
        engine?: string;
        tableCount: number;
        resourceId: string;
    }

    const props = defineProps<NodeProps<DatabaseNodeData>>();

    const tableService = useTableService();
    const UIStore = useUIStore();

    const isAddingTable = ref(false);

    async function addTable() {
        if (isAddingTable.value) return;
        isAddingTable.value = true;

        try {
            const tableId = await tableService.createTable('New table', props.data.resourceId);
            // The new table opens with its name in edit mode, so it can be named right away
            UIStore.editingTableId = tableId;
        }
        finally {
            isAddingTable.value = false;
        }
    }
</script>

<template>
    <div class="database-node">
        <Handle
            type="target"
            :position="Position.Top"
        />

        <!-- The table nodes are rendered by Vue Flow as children on top of this node -->
        <header class="database-header">
            <span class="database-icon">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                    <ellipse cx="8" cy="3.5" rx="5.5" ry="2" />
                    <path d="M2.5 3.5v9c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-9" />
                    <path d="M2.5 8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2" />
                </svg>
            </span>

            <span class="database-name">
                {{ props.data.label }}
            </span>

            <span
                v-if="props.data.engine"
                class="engine-badge"
            >
                {{ props.data.engine }}
            </span>

            <span class="table-count">
                {{ props.data.tableCount }} {{ props.data.tableCount === 1 ? 'table' : 'tables' }}
            </span>

            <button
                type="button"
                class="add-table-button nodrag"
                title="Add table"
                :disabled="isAddingTable"
                @click.stop="addTable"
            >
                <svg viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M6 2v8M2 6h8" />
                </svg>
            </button>
        </header>

        <Handle
            type="source"
            :position="Position.Bottom"
        />
    </div>
</template>

<style>
.vue-flow__node-database {
    box-sizing: border-box;
    border: 1px solid #a7d7bb;
    border-radius: 12px;
    background: #f1faf4;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);

    transition: box-shadow 0.15s ease, border-color 0.15s ease;
}

.vue-flow__node-database:hover {
    border-color: #6cc293;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
}

.vue-flow__node-database.selected {
    border-color: #22a35a;
    box-shadow: 0 0 0 3px rgba(34, 163, 90, 0.18);
}
</style>

<style scoped>
.database-node {
    width: 100%;
    height: 100%;
}

.database-header {
    display: flex;
    align-items: center;
    gap: 8px;

    height: 30px;
    padding: 0 10px;

    color: #14532d;
    font-size: 12px;
}

.database-icon {
    display: inline-flex;
    flex: 0 0 auto;
    width: 16px;
    height: 16px;
}

.database-icon svg {
    width: 100%;
    height: 100%;
    fill: none;
    stroke: #22a35a;
    stroke-width: 1.4;
}

.database-name {
    min-width: 0;
    overflow: hidden;

    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.engine-badge {
    flex: 0 0 auto;
    padding: 1px 7px;
    border-radius: 999px;

    background: #dcf2e4;
    color: #166534;
    font-size: 10px;
    font-weight: 600;
}

.table-count {
    flex: 0 0 auto;
    margin-left: auto;

    color: #4d7c5f;
    font-size: 11px;
}

.add-table-button {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;

    width: 18px;
    height: 18px;
    padding: 0;

    border: 1px solid #a7d7bb;
    border-radius: 5px;
    background: #ffffff;
    cursor: pointer;

    transition: background 0.15s ease, border-color 0.15s ease;
}

.add-table-button:hover {
    border-color: #22a35a;
    background: #dcf2e4;
}

.add-table-button:disabled {
    cursor: wait;
    opacity: 0.6;
}

.add-table-button svg {
    width: 10px;
    height: 10px;
    fill: none;
    stroke: #22a35a;
    stroke-width: 1.6;
    stroke-linecap: round;
}
</style>
