<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useResourceService } from '../services/resource.service';

const resourceService = useResourceService();

const newDatabaseName = ref('');

onMounted(() => {
    resourceService.fetchResources();
});

function addDatabase() {
    resourceService.createResource(newDatabaseName.value, 'database');
}

function removeDatabase(id: string) {
    resourceService.removeResource(id);
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
            <li v-for="database in resourceService.getByType('database')">
                {{ database.name }}
                <button class="btn-primary" @click="removeDatabase(database.id)">X</button>
            </li>
        </ul>
    </div>
</template>