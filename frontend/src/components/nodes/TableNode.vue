
<script setup lang="ts">
    import type { NodeProps } from '@vue-flow/core';
    import { computed, nextTick, ref, watch } from 'vue';
    import { useResourceService } from '../../services/resources/resource.service';
    import { useTableService } from '../../services/resources/table.service';
    import { useUIStore } from '../../stores/canvas/ui.store';
    import type { Table } from '../../stores/resources/table.store';

    const props = defineProps<NodeProps>();
    const resourceService = useResourceService();


    const table = computed(() =>
        resourceService.getResource(props.data.resourceId) as Table | undefined
    );

    const tableService = useTableService();

    // Deleting asks for a second click, so a table is not removed by accident
    const isConfirmingDelete = ref(false);
    let confirmTimeout: ReturnType<typeof setTimeout> | undefined;

    function onDeleteClick() {
        if (!isConfirmingDelete.value) {
            isConfirmingDelete.value = true;
            confirmTimeout = setTimeout(() => { isConfirmingDelete.value = false; }, 3000);
            return;
        }
        clearTimeout(confirmTimeout);
        isConfirmingDelete.value = false;
        tableService.deleteTable(props.data.resourceId);
    }
    const UIStore = useUIStore();

    const nameInput = ref<HTMLInputElement>();
    const editedName = ref('');

    const isEditingName = computed(() => UIStore.editingTableId === props.data.resourceId);

    // Opens the input with the current name selected, also when a new table starts in edit mode
    watch(isEditingName, async (isEditing) => {
        if (!isEditing) return;

        editedName.value = table.value?.name ?? '';
        await nextTick();
        nameInput.value?.focus();
        nameInput.value?.select();
    }, { immediate: true });

    function startEditingName() {
        UIStore.editingTableId = props.data.resourceId;
    }

    function stopEditingName() {
        if (isEditingName.value) {
            UIStore.editingTableId = undefined;
        }
    }

    function saveName() {
        if (!isEditingName.value) return;

        const name = editedName.value.trim();
        if (name && table.value && name !== table.value.name) {
            tableService.renameTable(table.value.id, name);
        }
        stopEditingName();
    }
</script>

<!-- The header height, row height and bottom padding have to match TABLE_LAYOUT in canvas.projection.ts -->
<template>
    <div class="table-node">
        <header class="table-header">
            <span class="table-icon">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                    <rect x="2" y="2.5" width="12" height="11" rx="2" />
                    <path d="M2 6h12M6.5 6v7.5" />
                </svg>
            </span>

            <input
                v-if="isEditingName"
                ref="nameInput"
                v-model="editedName"
                class="table-name-input nodrag"
                type="text"
                placeholder="Table name"
                @keydown.enter.prevent="saveName"
                @keydown.esc.prevent="stopEditingName"
                @blur="saveName"
                @click.stop
            />

            <span
                v-else
                class="table-name"
                title="Double click to rename"
                @dblclick.stop="startEditingName"
            >
                {{ props.data.label }}
            </span>

            <span
                v-if="table"
                class="column-count"
            >
                {{ table.columns.length }}
            </span>

            <button
                type="button"
                class="table-delete-button nodrag"
                :class="{ confirming: isConfirmingDelete }"
                :title="isConfirmingDelete ? 'Click again to delete this table' : 'Delete table'"
                @click.stop="onDeleteClick"
            >
                {{ isConfirmingDelete ? 'Delete?' : '×' }}
            </button>
        </header>

        <ul
            v-if="table?.columns.length"
            class="column-list"
        >
            <li
                v-for="column in table.columns"
                :key="column.id"
                class="column"
            >
                <span class="column-dot" />
                <span class="column-name">{{ column.fieldName }}</span>
            </li>
        </ul>

        <div
            v-else
            class="empty-table"
        >
            {{ table ? 'No columns' : 'No table' }}
        </div>
    </div>
</template>

<style lang="css">
.vue-flow__node-table {
    box-sizing: border-box;
    overflow: hidden;

    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);

    transition: box-shadow 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.vue-flow__node-table:hover {
    border-color: #cbd5e1;
    box-shadow: 0 3px 10px rgba(15, 23, 42, 0.1);
    transform: translateY(-1px);
}

.vue-flow__node-table.selected {
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.18);
}
</style>

<style scoped>
.table-node {
    color: #1e293b;
    font-size: 8px;
    line-height: 1.2;
}

.table-header {
    display: flex;
    align-items: center;
    gap: 4px;

    box-sizing: border-box;
    height: 20px;
    padding: 0 6px;

    font-size: 9px;

    border-bottom: 1px solid #eef2f7;
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
}

.table-icon {
    display: inline-flex;
    flex: 0 0 auto;
    width: 9px;
    height: 9px;
}

.table-icon svg {
    width: 100%;
    height: 100%;
    fill: none;
    stroke: #6366f1;
    stroke-width: 1.4;
}

.table-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;

    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.table-name {
    cursor: text;
}

.table-name-input {
    flex: 1;
    min-width: 0;
    height: 14px;
    padding: 0 3px;

    border: 1px solid #a5b4fc;
    border-radius: 3px;
    outline: none;
    background: #ffffff;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);

    color: #1e293b;
    font: inherit;
    font-weight: 600;
}

.table-delete-button {
    display: none;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;

    min-width: 12px;
    height: 12px;
    padding: 0 2px;

    border: 0;
    border-radius: 3px;
    background: transparent;

    color: #94a3b8;
    font: inherit;
    font-size: 9px;
    line-height: 1;
    cursor: pointer;
}

.table-node:hover .table-delete-button,
.table-delete-button.confirming {
    display: inline-flex;
}

.table-delete-button:hover {
    background: #fee2e2;
    color: #dc2626;
}

.table-delete-button.confirming {
    background: #dc2626;
    color: #ffffff;
    font-size: 7px;
    font-weight: 700;
}

.column-count {
    flex: 0 0 auto;
    padding: 0 4px;
    border-radius: 999px;

    background: #eef2ff;
    color: #4f46e5;
    font-size: 7px;
    font-weight: 600;
    line-height: 11px;
}

.column-list {
    margin: 0;
    padding: 0;
    list-style: none;
}

.column {
    display: flex;
    align-items: center;
    gap: 4px;

    box-sizing: border-box;
    height: 13px;
    padding: 0 6px;

    transition: background 0.1s ease;
}

.column:hover {
    background: #f8fafc;
}

.column-dot {
    flex: 0 0 auto;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: #a5b4fc;
}

.column-name {
    min-width: 0;
    overflow: hidden;

    white-space: nowrap;
    text-overflow: ellipsis;
}

.empty-table {
    display: flex;
    align-items: center;

    height: 13px;
    padding: 0 6px;

    color: #94a3b8;
    font-size: 7px;
    font-style: italic;
}
</style>
