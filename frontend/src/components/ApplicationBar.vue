<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Menu, Button } from 'primevue'

import { useApiStore, type Api } from '../stores/api.store';
import { useApplicationStore } from '../stores/resources/application.store';
import { useApplicationService } from '../services/resources/application.service';
import { exportToCsv } from '../helpers/export';

const applicationStore = useApplicationStore();
const applicationService = useApplicationService();

const apiStore = useApiStore();

const newApplicationName = ref('');
const expanded = ref(true);

// Focuses the url input as soon as it appears
const vFocus = { mounted: (el: HTMLElement) => el.focus() };

const tempApplicationId = ref<string | null>(null);
const tempUrl = ref<string | null>(null);

const menu = ref();
const menuItems = ref([
  {
    label: 'Export',
    icon: 'pi pi-download',
    command: () => {
      exportToCsv(applicationStore.applications, ['name'], 'Application Export.csv');
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
    applicationService.fetchApplications();
    apiStore.fetchApis();
});

function toggleMenu(event: Event) {
  menu.value.toggle(event);
}

function addApplication(){
    if(!newApplicationName.value.trim()) return;
    applicationService.createAppliction(newApplicationName.value.trim());
    newApplicationName.value = ''
}

function removeApplication(id: string){
    applicationService.deleteApplication(id);
}

function addTempApi(applicationId: string) {
    tempApplicationId.value = applicationId;
    tempUrl.value = '';
}

function commitApi() {
    if(tempApplicationId.value && tempUrl.value) { 
        apiStore.commitApi(tempApplicationId.value, tempUrl.value);    
    }
    tempApplicationId.value = null;
    tempUrl.value = null;
}

function updateApi(api: Api) {
    apiStore.updateApi(api.id, api);
}

function deleteApi(id: string) {
    apiStore.deleteApi(id);
}
</script>

<template>
    <section class="sidebar-section">
        <button
            type="button"
            class="sidebar-section-header"
            @click="expanded = !expanded"
        >
            <span class="sidebar-section-icon application"><i class="pi pi-desktop" /></span>
            <span class="sidebar-section-title">Applications</span>
            <span class="sidebar-section-count">{{ applicationStore.applications.length }}</span>
            <i class="pi pi-chevron-right sidebar-section-chevron" :class="{ expanded }" />
        </button>

        <div v-if="expanded" class="sidebar-section-body">
            <div class="sidebar-add-row">
                <input
                    v-model="newApplicationName"
                    type="text"
                    class="sidebar-input"
                    placeholder="New application"
                    @keyup.enter="addApplication"
                />
                <button
                    type="button"
                    class="sidebar-add-button"
                    title="Add application"
                    :disabled="!newApplicationName.trim()"
                    @click="addApplication"
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

            <div v-if="!applicationStore.applications.length" class="sidebar-empty">
                No applications yet
            </div>

            <ul class="sidebar-list">
                <li v-for="application in applicationStore.applications" :key="application.id">
                    <div class="sidebar-item">
                        <span class="sidebar-item-name">{{ application.name }}</span>

                        <span class="sidebar-item-actions">
                            <button
                                type="button"
                                class="sidebar-icon-button"
                                title="Add API url"
                                @click="addTempApi(application.id)"
                            >
                                <i class="pi pi-link" />
                            </button>
                            <button
                                type="button"
                                class="sidebar-icon-button danger"
                                title="Delete application"
                                @click="removeApplication(application.id)"
                            >
                                <i class="pi pi-trash" />
                            </button>
                        </span>
                    </div>

                    <ul
                        v-if="apiStore.getApplicationApis(application.id).length || tempApplicationId === application.id"
                        class="sidebar-sublist"
                    >
                        <li
                            v-for="api in apiStore.getApplicationApis(application.id)"
                            :key="api.id"
                            class="sidebar-item"
                        >
                            <i class="pi pi-globe sidebar-sub-icon" />
                            <span class="sidebar-item-name" :title="api.url">{{ api.url }}</span>

                            <label class="sidebar-checkbox" title="Requires authentication">
                                <input v-model="api.hasAuthentication" type="checkbox" @change="updateApi(api)"/>
                                Auth
                            </label>

                            <span class="sidebar-item-actions">
                                <button
                                    type="button"
                                    class="sidebar-icon-button danger"
                                    title="Delete API url"
                                    @click="deleteApi(api.id)"
                                >
                                    <i class="pi pi-times" />
                                </button>
                            </span>
                        </li>
                        <li v-if="tempApplicationId === application.id" class="sidebar-item">
                            <input
                                v-model="tempUrl"
                                v-focus
                                class="sidebar-input"
                                placeholder="Enter url"
                                @keyup.enter="($event.target as HTMLInputElement).blur()"
                                @blur="commitApi()"
                            />
                        </li>
                    </ul>
                </li>
            </ul>
        </div>
    </section>
</template>