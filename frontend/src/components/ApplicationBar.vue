<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Menu, Button } from 'primevue'

import { useApiStore, type Api } from '../stores/api.store';
import { useApplicationStore } from '../stores/application.store';
import { useApplicationService } from '../services/application.service';
import { exportToCsv } from '../helpers/export';

const applicationStore = useApplicationStore();
const applicationService = useApplicationService();

const apiStore = useApiStore();

const newApplicationName = ref('');

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
    applicationStore.fetchApplications();
    apiStore.fetchApis();
});

function toggleMenu(event: Event) {
  menu.value.toggle(event);
}

function addApplication(){
    applicationService.createAppliction(newApplicationName.value);
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
    Applications
    <div>
        <input type="text" v-model="newApplicationName" placeholder="Application name" @keyup.enter="addApplication"/>
        <button @click="addApplication">Add</button>
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
            <li v-for="application in applicationStore.applications">
                <button @click="addTempApi(application.id)">+</button>
                {{ application.name }}
                <button class="btn-primary" @click="removeApplication(application.id)">X</button>
                <ul>
                    <li v-for="api in apiStore.getApplicationApis(application.id)" :key="api.id">
                        <span>
                            {{ api.url }}
                            <input v-model="api.hasAuthentication" type="checkbox" @change="updateApi(api)"/>
                            <button @click="deleteApi(api.id)">X</button>
                        </span>
                    </li>
                    <li v-if="tempApplicationId === application.id">
                        <input
                            v-model="tempUrl"
                            @blur="commitApi()"
                            placeholder="Enter url"
                        />
                    </li>
                </ul>
            </li>
        </ul>
    </div>
</template>