<script setup lang="ts">
import { useAuthStore } from '../../stores/auth.store';
import DetailInfo from '../DetailInfo.vue';

const authStore = useAuthStore();
</script>

<template>
    This is the right sidebar
    <button @click="authStore.logout()">Logout</button>
    <DetailInfo />
</template>