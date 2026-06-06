<script setup lang="ts">
import { useAuthStore } from '../../stores/auth.store';

const authStore = useAuthStore();
</script>

<template>
    This is the right sidebar
    <button @click="authStore.logout()">Logout</button>
</template>