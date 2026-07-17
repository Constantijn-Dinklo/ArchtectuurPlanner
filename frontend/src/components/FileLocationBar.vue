<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useFileLocationStore } from '../stores/resources/fileLocation.store';
import { useFileLocationService } from '../services/resources/fileLocation.service';

const fileLocationStore = useFileLocationStore();
const fileLocationService = useFileLocationService();

const newFileLocation = ref('');

onMounted(() => {
    fileLocationStore.fetchFileLocations();
});

function addFileLocation() {
    fileLocationService.createFileLocation(newFileLocation.value);
}

function removeFileLocation(id: string) {
    fileLocationService.deleteFileLocation(id);
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
            <li v-for="fileLocation in fileLocationStore.fileLocations">
                {{ fileLocation.name }}
                <button class="btn-primary" @click="removeFileLocation(fileLocation.id)">X</button>
            </li>
        </ul>
    </div>
</template>