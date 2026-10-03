<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Menu, Button } from 'primevue'

import { useDatabaseStore } from '../stores/resources/database.store';
import { useDatabaseService } from '../services/resources/database.service';
import { exportToCsv } from '../helpers/export';

const databaseStore = useDatabaseStore();
const databaseService = useDatabaseService();

const newDatabaseName = ref('');
const expanded = ref(true);

const menu = ref();
const menuItems = ref([
  {
    label: 'Export',
    icon: 'pi pi-download',
    command: () => {
      exportToCsv(databaseStore.databases, ['name'], 'DB Export.csv');
    }
  },
  {
    label: 'Import',
    icon: 'pi pi-upload',
    command: () => {
      console.log("Import")
    }
  }
]);

onMounted(() => {
    databaseStore.fetchDatabases();
});

function toggleMenu(event: Event) {
  menu.value.toggle(event);
}

function addDatabase() {
    if(!newDatabaseName.value.trim()) return;
    databaseService.createDatabase(newDatabaseName.value.trim());
    newDatabaseName.value = ''
}

function removeDatabase(id: string) {
    databaseService.deleteDatabase(id);
}

</script>

<template>
    <section class="sidebar-section">
        <button
            type="button"
            class="sidebar-section-header"
            @click="expanded = !expanded"
        >
            <span class="sidebar-section-icon database"><i class="pi pi-database" /></span>
            <span class="sidebar-section-title">Databases</span>
            <span class="sidebar-section-count">{{ databaseStore.databases.length }}</span>
            <i class="pi pi-chevron-right sidebar-section-chevron" :class="{ expanded }" />
        </button>

        <div v-if="expanded" class="sidebar-section-body">
            <div class="sidebar-add-row">
                <input
                    v-model="newDatabaseName"
                    type="text"
                    class="sidebar-input"
                    placeholder="New database"
                    @keyup.enter="addDatabase"
                />
                <button
                    type="button"
                    class="sidebar-add-button"
                    title="Add database"
                    :disabled="!newDatabaseName.trim()"
                    @click="addDatabase"
                >
                    <i class="pi pi-plus" />
                </button>
                <!-- <Button
                  icon="pi pi-ellipsis-v"
                  text
                  @click="toggleMenu($event)"
                />
                <Menu
                    ref="menu"
                    :model="menuItems"
                    popup
                /> -->
            </div>

            <div v-if="!databaseStore.databases.length" class="sidebar-empty">
                No databases yet
            </div>

            <ul class="sidebar-list">
                <li
                    v-for="database in databaseStore.databases"
                    :key="database.id"
                    class="sidebar-item"
                >
                    <span class="sidebar-item-name">{{ database.name }}</span>

                    <span class="sidebar-item-actions">
                        <button
                            type="button"
                            class="sidebar-icon-button danger"
                            title="Delete database"
                            @click="removeDatabase(database.id)"
                        >
                            <i class="pi pi-trash" />
                        </button>
                    </span>
                </li>
            </ul>
        </div>
    </section>
</template>