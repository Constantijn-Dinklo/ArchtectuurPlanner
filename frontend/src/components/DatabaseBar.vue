<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Menu, Button } from 'primevue'

import { useDatabaseStore } from '../stores/resources/database.store';
import { useDatabaseService } from '../services/resources/database.service';
import { exportToCsv } from '../helpers/export';

const databaseStore = useDatabaseStore();
const databaseService = useDatabaseService();

const newDatabaseName = ref('');

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
    databaseService.createDatabase(newDatabaseName.value);
}

function removeDatabase(id: string) {
    databaseService.deleteDatabase(id);
    newDatabaseName.value = ''
}

</script>

<template>
    Databases
    <div>
        <input type="text" v-model="newDatabaseName" placeholder="Database name" @keyup.enter="addDatabase"/>
        <button @click="addDatabase">Add</button>
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
    <div>
        <ul>
            <li v-for="database in databaseStore.databases">
                {{ database.name }}
                <button class="btn-primary" @click="removeDatabase(database.id)">X</button>
            </li>
        </ul>
    </div>
</template>