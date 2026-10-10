<script setup lang="ts">
    import { vCollapsible } from '../../directives/collapsible';
    import { computed, onMounted, ref } from 'vue';
    import { useSelectedNodeProjection } from '../../projections/selectedNode.projection';
    import { useDatabaseStore, type Database } from '../../stores/resources/database.store';

    import ConnectionsDetail from '../ConnectionsDetail.vue';
    import EndpointsSection from './EndpointsSection.vue';
    import { useTableStore } from '../../stores/resources/table.store.ts';
    import { useTableService } from '../../services/resources/table.service.ts';

    const selectedNodeProjection = useSelectedNodeProjection();
    const databaseStore = useDatabaseStore();
    const tableStore = useTableStore();
    const tableService = useTableService();

    const newTableName = ref('');

    const database = computed(
        () => selectedNodeProjection.nodeInfo.value?.node as Database | undefined
    );

    onMounted(() => {
        tableStore.fetchTables();
    })

    function onEngineChange() {
        if(!database.value) { return }
        databaseStore.updateDatabase(database.value.id, database.value)
    }

    function createTable(databaseId: string) {
        if(!newTableName.value.trim()) { return }
        tableService.createTable(newTableName.value.trim(), databaseId);
        newTableName.value = '';
    }

    function deleteTable(tableId: string) {
        tableService.deleteTable(tableId);
    }

</script>

<template>
    <div v-if="database">
        <header class="detail-header">
            <span class="detail-header-icon database"><i class="pi pi-database" /></span>
            <div class="detail-header-text">
                <span class="detail-type-label">Database</span>
                <h2>{{ database.name }}</h2>
            </div>
        </header>

        <section v-collapsible class="detail-section">
            <div class="detail-section-title">Properties</div>

            <label class="detail-property">
                <span class="detail-property-label">Engine</span>
                <select
                    v-model="database.engine"
                    class="detail-select"
                    @change="onEngineChange"
                >
                    <option key="SQL" value="SQL">SQL</option>
                    <option key="MySQL" value="MySQL">MySQL</option>
                    <option key="NoSQL" value="NoSQL">NoSQL</option>
                </select>
            </label>
        </section>

        <section v-collapsible class="detail-section">
            <div class="detail-section-title">
                <span>Tables</span>
                <span class="detail-count">{{ tableStore.getTables(database.id).length }}</span>
            </div>

            <div
                v-if="!tableStore.getTables(database.id).length"
                class="detail-empty"
            >
                No tables
            </div>

            <div
                v-for="table in tableStore.getTables(database.id)"
                :key="table.id"
                class="detail-row"
            >
                <i class="pi pi-table detail-row-icon" />
                <span class="detail-row-name">{{ table.name }}</span>
                <button
                    type="button"
                    class="detail-delete-button"
                    title="Delete table"
                    @click="deleteTable(table.id)"
                >
                    ×
                </button>
            </div>

            <div class="detail-add-row">
                <input
                    v-model="newTableName"
                    type="text"
                    class="detail-input"
                    placeholder="+ New table"
                    @keyup.enter="createTable(database.id)"
                />
                <button
                    type="button"
                    class="detail-add-button"
                    title="Add table"
                    :disabled="!newTableName.trim()"
                    @click="createTable(database.id)"
                >
                    <i class="pi pi-plus" />
                </button>
            </div>
        </section>

        <EndpointsSection
            :resource-id="database.id"
            resource-type="database"
        />

        <ConnectionsDetail
            v-if="selectedNodeProjection.nodeInfo.value"
            :connections-info="selectedNodeProjection.nodeInfo.value.connections"
        />
    </div>
</template>