<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useFileLocationStore } from '../stores/resources/fileLocation.store';
import { useFileLocationService } from '../services/resources/fileLocation.service';

const fileLocationStore = useFileLocationStore();
const fileLocationService = useFileLocationService();

const newFileLocation = ref('');
const expanded = ref(true);

onMounted(() => {
    fileLocationStore.fetchFileLocations();
});

function addFileLocation() {
    if(!newFileLocation.value.trim()) return;
    fileLocationService.createFileLocation(newFileLocation.value.trim());
    newFileLocation.value = '';
}

function removeFileLocation(id: string) {
    fileLocationService.deleteFileLocation(id);
}

</script>

<template>
    <section class="sidebar-section">
        <button
            type="button"
            class="sidebar-section-header"
            @click="expanded = !expanded"
        >
            <span class="sidebar-section-icon file-location"><i class="pi pi-folder" /></span>
            <span class="sidebar-section-title">File Locations</span>
            <span class="sidebar-section-count">{{ fileLocationStore.fileLocations.length }}</span>
            <i class="pi pi-chevron-right sidebar-section-chevron" :class="{ expanded }" />
        </button>

        <div v-if="expanded" class="sidebar-section-body">
            <div class="sidebar-add-row">
                <input
                    v-model="newFileLocation"
                    type="text"
                    class="sidebar-input"
                    placeholder="New file location"
                    @keyup.enter="addFileLocation"
                />
                <button
                    type="button"
                    class="sidebar-add-button"
                    title="Add file location"
                    :disabled="!newFileLocation.trim()"
                    @click="addFileLocation"
                >
                    <i class="pi pi-plus" />
                </button>
            </div>

            <div v-if="!fileLocationStore.fileLocations.length" class="sidebar-empty">
                No file locations yet
            </div>

            <ul class="sidebar-list">
                <li
                    v-for="fileLocation in fileLocationStore.fileLocations"
                    :key="fileLocation.id"
                    class="sidebar-item"
                >
                    <span class="sidebar-item-name">{{ fileLocation.name }}</span>

                    <span class="sidebar-item-actions">
                        <button
                            type="button"
                            class="sidebar-icon-button danger"
                            title="Delete file location"
                            @click="removeFileLocation(fileLocation.id)"
                        >
                            <i class="pi pi-trash" />
                        </button>
                    </span>
                </li>
            </ul>
        </div>
    </section>
</template>