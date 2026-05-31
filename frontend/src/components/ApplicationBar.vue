<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useApplicationStore } from '../stores/application.store';
import { useApplicationService } from '../services/application.service';
import { useApiStore } from '../stores/api.store';

const applicationService = useApplicationService();
const applicationStore = useApplicationStore();

const apiStore = useApiStore();

const newApplicationName = ref('');

const tempUrl = ref('');

onMounted(() => {
    applicationService.fetchApplications();
    apiStore.fetchApis();
})

function addApplication(){
    applicationService.addApplication(newApplicationName.value);
}

function removeApplication(id: string){
    applicationService.removeApplication(id);
}

async function addTempApi(applicationId: string) {
    apiStore.createTempApi(applicationId);
}

function commitTempApi() {
    apiStore.commitTempApi(tempUrl.value);
    tempUrl.value = ''
}

function deleteApi(id: string) {
    apiStore.deleteApi(id);
}

</script>

<template>
    <div>
        <input type="text" v-model="newApplicationName" placeholder="Application name"/>
        <button @click="addApplication">Add</button>
    </div>
    <div>
        <ul>
            <li v-for="application in applicationStore.applications">
                <button @click="addTempApi(application.id)">+</button>
                {{ application.name }}
                <button class="btn-primary" @click="removeApplication(application.id)">X</button>
                <ul>
                    <li v-for="api in apiStore.getApplicationApis(application.id)" :key="api.id">
                        <input
                            v-if="!api.url"
                            :value="tempUrl"
                            @input="tempUrl = $event.target ? ($event.target as HTMLInputElement).value : ''"
                            @blur="commitTempApi()"
                            placeholder="Enter url"
                        />
                        <span v-else>
                            {{ api.url }}
                            <button @click="deleteApi(api.id)">X</button>
                        </span>
                    </li>
                </ul>
            </li>
        </ul>
    </div>
</template>