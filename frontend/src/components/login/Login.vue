<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../../stores/auth.store';


const authStore = useAuthStore();

const loginUsername = ref('');
const loginPassword = ref('');

const orgName = ref('');

</script>

<template>
    Login
    <div>
        Username: <input v-model="loginUsername"/>
    </div>
    <div>
        Password: <input v-model="loginPassword"/>
    </div>
    <div>
        <button @click="authStore.login(loginUsername, loginPassword)">Login</button>
    </div>

    Org
    <div>
        Name: <input v-model="orgName"/>
    </div>
    <div>
        <button @click="authStore.createOrg(orgName)">Create</button>
    </div>
    
</template>