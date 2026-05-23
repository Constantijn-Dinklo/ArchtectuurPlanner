<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useApplicationStore } from '../stores/application.store';
import { useApplicationService } from '../services/application.service';

const applicationService = useApplicationService();

const applicationStore = useApplicationStore();

const newApplicationName = ref('');

onMounted(() => {
    applicationService.fetchApplications();
})

function addApplication(){
    applicationService.addApplication(newApplicationName.value);
}

function removeApplication(id: string){
    applicationService.removeApplication(id);
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
                {{ application.name }}
                <button class="btn-primary" @click="removeApplication(application.id)">X</button>
            </li>
        </ul>
    </div>
</template>