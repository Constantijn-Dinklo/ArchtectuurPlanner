<script setup lang="ts">
import { ref } from 'vue';
import { useApplicationStore } from '../stores/application.store';

const applicationStore = useApplicationStore();

const newApplicationName = ref('')

function addApplication(){
    applicationStore.addApplication(newApplicationName.value);
}

function removeApplication(id: string){
    applicationStore.removeApplication(id);
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