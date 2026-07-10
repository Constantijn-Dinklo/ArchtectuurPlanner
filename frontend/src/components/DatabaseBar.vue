<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useDatabaseStore } from '../stores/database.store';
import { useDatabaseService } from '../services/database.service';

const databaseStore = useDatabaseStore();
const databaseService = useDatabaseService();

const newDatabaseName = ref('');

onMounted(() => {
    databaseStore.fetchDatabases();
});

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
        <input type="text" v-model="newDatabaseName" placeholder="Database name"/>
        <button @click="addDatabase">Add</button>
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