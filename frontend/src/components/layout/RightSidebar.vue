<script setup lang="ts">
import { useAuthStore } from '../../stores/auth.store';
import DetailInfo from '../details/DetailInfo.vue';

const authStore = useAuthStore();
</script>

<template>
    <div class="right-sidebar-content">
        <div class="right-sidebar-bar">
            <span class="right-sidebar-heading">Details</span>

            <button
                type="button"
                class="logout-button"
                @click="authStore.logout()"
            >
                <i class="pi pi-sign-out" />
                Logout
            </button>
        </div>

        <DetailInfo />
    </div>
</template>

<style scoped>
.right-sidebar-content {
    min-height: 100%;
    background: #f8fafc;
}

.right-sidebar-bar {
    position: sticky;
    top: 0;
    z-index: 1;

    display: flex;
    align-items: center;
    justify-content: space-between;

    padding: 10px 16px;
    border-bottom: 1px solid #e2e8f0;
    background: #f8fafc;
}

.right-sidebar-heading {
    color: #64748b;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.logout-button {
    display: inline-flex;
    align-items: center;
    gap: 5px;

    height: 26px;
    padding: 0 10px;

    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #ffffff;

    color: #475569;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;

    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.logout-button:hover {
    border-color: #fecaca;
    background: #fef2f2;
    color: #dc2626;
}

.logout-button .pi {
    font-size: 11px;
}
</style>
