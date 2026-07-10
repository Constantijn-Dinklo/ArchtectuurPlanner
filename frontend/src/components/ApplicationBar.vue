<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useApiStore } from '../stores/api.store';
import { useApplicationStore } from '../stores/application.store';
import { useApplicationService } from '../services/application.service';

const applicationStore = useApplicationStore();
const applicationService = useApplicationService();

const apiStore = useApiStore();

const newApplicationName = ref('');

const tempApplicationId = ref<string | null>(null);
const tempUrl = ref<string | null>(null);

onMounted(() => {
    applicationStore.fetchApplications();
    apiStore.fetchApis();
})

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

function deleteApi(id: string) {
    apiStore.deleteApi(id);
}

</script>

<template>
    Applications
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
                        <span>
                            {{ api.url }}
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