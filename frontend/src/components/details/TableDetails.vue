<script setup lang="ts">
    import { vCollapsible } from '../../directives/collapsible';
    import { computed, ref } from 'vue';
    import { Select } from 'primevue';
    import { useSelectedNodeProjection } from '../../projections/selectedNode.projection';
    import { useTableStore, type Table } from '../../stores/resources/table.store';
    import { useResourceService } from '../../services/resources/resource.service';
    import { useTableService } from '../../services/resources/table.service';
import type { AccessibleInformationField } from '../../types/informationField.type';
    import EndpointsSection from './EndpointsSection.vue';

    const resourceService = useResourceService();

    const selectedNodeProjection = useSelectedNodeProjection();
    const tableStore = useTableStore();
    const tableService = useTableService();

    // Deleting asks for a second click, so a table is not removed by accident
    const isConfirmingDelete = ref(false);
    let confirmTimeout: ReturnType<typeof setTimeout> | undefined;

    function onDeleteClick(tableId: string) {
        if (!isConfirmingDelete.value) {
            isConfirmingDelete.value = true;
            confirmTimeout = setTimeout(() => { isConfirmingDelete.value = false; }, 3000);
            return;
        }
        clearTimeout(confirmTimeout);
        isConfirmingDelete.value = false;
        tableService.deleteTable(tableId);
    }

    const newColumnName = ref('');
    const inputColumn = ref<AccessibleInformationField | undefined>();

    const table = computed(
        () => selectedNodeProjection.nodeInfo.value?.node as Table | undefined
    );

    // Fields that are part of an object are shown with the object, e.g. "customerId (Order)"
    const accessibleInformationFields = computed(() =>
        (table.value ? resourceService.getAccessibleInformationFields(table.value.databaseId) : [])
            .map(field => ({
                ...field,
                label: field.objectNames?.length ? `${field.fieldName} (${field.objectNames.join(', ')})` : field.fieldName
            }))
    );

    function createColumn(tableId: string, newInformationField: boolean = true){
        if(newInformationField){
            if(!newColumnName.value.trim()) { return }
            tableStore.createColumn(tableId, {
                fieldName: newColumnName.value.trim()
            });
            newColumnName.value = '';
        }
        else {
            if(!inputColumn.value) { return }
            tableStore.createColumn(tableId, {
                informationFieldId: inputColumn.value.id,
                sourceResourceId: inputColumn.value.accessibleFromId,
                sourceResourceType: inputColumn.value.accessibleFromType
            });
            inputColumn.value = undefined;
        }
    }

    function deleteColumn(tableId: string, column: string){
        tableStore.deleteColumn(tableId, column);
    }
</script>

<template>
    <div v-if="table">
        <header class="detail-header">
            <span class="detail-header-icon table"><i class="pi pi-table" /></span>
            <div class="detail-header-text">
                <span class="detail-type-label">Table</span>
                <h2>{{ table.name }}</h2>
            </div>

            <button
                type="button"
                class="delete-table-button"
                :class="{ confirming: isConfirmingDelete }"
                :title="isConfirmingDelete ? 'Click again to delete this table' : 'Delete table'"
                @click="onDeleteClick(table.id)"
            >
                <i class="pi pi-trash" />
                {{ isConfirmingDelete ? 'Click again to delete' : 'Delete' }}
            </button>
        </header>

        <section v-collapsible class="detail-section">
            <div class="detail-section-title">
                <span>Columns</span>
                <span class="detail-count">{{ table.columns.length }}</span>
            </div>

            <div
                v-if="!table.columns.length"
                class="detail-empty"
            >
                No columns
            </div>

            <div
                v-for="column in table.columns"
                :key="column.id"
                class="detail-row"
            >
                <span class="detail-row-name">{{ column.fieldName }}</span>
                <button
                    type="button"
                    class="detail-delete-button"
                    title="Delete column"
                    @click="deleteColumn(table.id, column.id)"
                >
                    ×
                </button>
            </div>

            <Select
                v-model="inputColumn"
                :options="accessibleInformationFields"
                option-label="label"
                :option-disabled="(field: AccessibleInformationField) =>
                    table!.columns.some((column) => column.id === field.id)"
                placeholder="+ Add accessible field"
                filter
                filter-placeholder="Search field"
                empty-message="No accessible fields"
                size="small"
                class="detail-prime-select"
                @change="createColumn(table.id, false)"
            />

            <div class="detail-add-row">
                <input
                    v-model="newColumnName"
                    type="text"
                    class="detail-input"
                    placeholder="+ New column"
                    @keyup.enter="createColumn(table.id)"
                />
                <button
                    type="button"
                    class="detail-add-button"
                    title="Add column"
                    :disabled="!newColumnName.trim()"
                    @click="createColumn(table.id)"
                >
                    <i class="pi pi-plus" />
                </button>
            </div>
        </section>

        <EndpointsSection
            :resource-id="table.id"
            resource-type="table"
        />
    </div>
</template>

<style scoped>
.delete-table-button {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 5px;

    height: 26px;
    padding: 0 9px;

    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #ffffff;

    color: #64748b;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;

    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.delete-table-button:hover {
    border-color: #fecaca;
    background: #fef2f2;
    color: #dc2626;
}

.delete-table-button.confirming {
    border-color: #dc2626;
    background: #dc2626;
    color: #ffffff;
}

.delete-table-button .pi {
    font-size: 11px;
}
</style>
