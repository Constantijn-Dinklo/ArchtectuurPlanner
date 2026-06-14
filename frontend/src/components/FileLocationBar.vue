<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useResourceService } from '../services/resource.service';

const resourceService = useResourceService();

const newFileLocation = ref('');

onMounted(() => {
    resourceService.fetchResources();
});

function addFileLocation() {
    resourceService.createResource(newFileLocation.value, 'fileLocation');
}

function removeFileLocation(id: string) {
    resourceService.removeResource(id);
}

</script>

<template>
    File Locations
    <div>
        <input type="text" v-model="newFileLocation" placeholder="File location"/>
        <button @click="addFileLocation">Add</button>
    </div>
    <div>
        <ul>
            <li v-for="fileLocation in resourceService.getByType('fileLocation')">
                {{ fileLocation.name }}
                <button class="btn-primary" @click="removeFileLocation(fileLocation.id)">X</button>
            </li>
        </ul>
    </div>
</template>