<!-- The management environment (beheer omgeving). For now an overview of the users of the organisation and their roles -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useOrganisationStore, type OrganisationRole } from '../../stores/organisation.store';
import type { Environment } from '../../stores/environment.store';

const organisationStore = useOrganisationStore();

const isLoading = ref(true);
const error = ref('');
const roleError = ref('');

// The users whose environments are shown
const expandedUsers = ref<Set<string>>(new Set());

const isCurrentUserAdmin = computed(() => {
    const overview = organisationStore.organisationUsers;
    return overview?.users.find(user => user.id === overview.currentUserId)?.organisationRole === 'admin';
});

onMounted(async () => {
    try {
        await organisationStore.fetchUsers();
    }
    catch {
        error.value = 'The users could not be loaded';
    }
    finally {
        isLoading.value = false;
    }
});

function toggleUser(userId: string) {
    const expanded = new Set(expandedUsers.value);
    if (expanded.has(userId)) {
        expanded.delete(userId);
    } else {
        expanded.add(userId);
    }
    expandedUsers.value = expanded;
}

async function changeOrganisationRole(userId: string, organisationRole: OrganisationRole) {
    roleError.value = '';
    try {
        await organisationStore.updateOrganisationRole(userId, organisationRole);
    }
    catch (err: any) {
        roleError.value = err.response?.data?.error ?? 'The role could not be changed';
    }
}

async function changeEnvironmentRole(userId: string, environmentId: string, role: Environment['role']) {
    roleError.value = '';
    try {
        await organisationStore.updateEnvironmentRole(userId, environmentId, role);
    }
    catch (err: any) {
        roleError.value = err.response?.data?.error ?? 'The role could not be changed';
    }
}
</script>

<template>
    <div class="management-view">
        <section class="management-card">
            <header class="management-header">
                <span class="management-icon"><i class="pi pi-users" /></span>
                <div>
                    <h1>Users</h1>
                    <p v-if="organisationStore.organisationUsers">
                        {{ organisationStore.organisationUsers.organisationName }}
                        · {{ organisationStore.organisationUsers.users.length }} user(s)
                    </p>
                </div>
            </header>

            <div v-if="isLoading" class="management-message">Loading users…</div>
            <div v-else-if="error" class="management-message error">{{ error }}</div>

            <template v-else-if="organisationStore.organisationUsers">
                <div v-if="roleError" class="management-message error role-error">{{ roleError }}</div>

                <ul class="user-list">
                    <li v-for="user in organisationStore.organisationUsers.users" :key="user.id" class="user-item">
                        <button type="button" class="user-row" @click="toggleUser(user.id)">
                            <i class="pi pi-chevron-right user-chevron" :class="{ expanded: expandedUsers.has(user.id) }" />
                            <span class="user-email">{{ user.email }}</span>
                            <span v-if="user.id === organisationStore.organisationUsers.currentUserId" class="you-label">You</span>
                            <span class="role-badge" :class="user.organisationRole">{{ user.organisationRole }}</span>
                        </button>

                        <div v-if="expandedUsers.has(user.id)" class="user-details">
                            <div v-if="isCurrentUserAdmin" class="organisation-role">
                                <span class="details-label">Organisation role</span>
                                <div class="role-switch">
                                    <button
                                        v-for="role in (['admin', 'member'] as const)"
                                        :key="role"
                                        type="button"
                                        :class="{ active: user.organisationRole === role }"
                                        @click="user.organisationRole !== role && changeOrganisationRole(user.id, role)"
                                    >
                                        {{ role }}
                                    </button>
                                </div>
                            </div>

                            <span class="details-label">Environments</span>
                            <p v-if="user.organisationRole === 'admin'" class="details-hint">
                                Admin of the organisation, so admin in every environment
                            </p>
                            <ul class="environment-list">
                                <li v-for="environment in user.environments" :key="environment.id" class="environment-row">
                                    <i class="pi pi-sitemap environment-icon" />
                                    <span class="environment-name">{{ environment.name }}</span>
                                    <!-- An organisation admin is admin everywhere, so only a member's role can be changed per environment -->
                                    <div v-if="isCurrentUserAdmin && user.organisationRole === 'member'" class="role-switch">
                                        <button
                                            v-for="role in (['admin', 'editor', 'viewer'] as const)"
                                            :key="role"
                                            type="button"
                                            :class="{ active: environment.role === role }"
                                            @click="environment.role !== role && changeEnvironmentRole(user.id, environment.id, role)"
                                        >
                                            {{ role }}
                                        </button>
                                    </div>
                                    <span v-else class="role-badge" :class="environment.role">{{ environment.role }}</span>
                                </li>
                            </ul>
                        </div>
                    </li>
                </ul>
            </template>
        </section>
    </div>
</template>

<style scoped>
.management-view {
    height: 100%;
    padding: 32px;
    overflow: auto;

    background: #f8fafc;
    text-align: left;
}

.management-card {
    max-width: 720px;
    margin: 0 auto;
    padding: 24px;

    border: 1px solid #e2e8f0;
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}

.management-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
}

.management-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;

    width: 40px;
    height: 40px;
    border-radius: 10px;

    background: #eef2ff;
    color: #4f46e5;
    font-size: 18px;
}

.management-header h1 {
    margin: 0;

    color: #1e293b;
    font-size: 18px;
    font-weight: 600;
}

.management-header p {
    margin: 2px 0 0;

    color: #64748b;
    font-size: 13px;
}

.management-message {
    color: #64748b;
    font-size: 13px;
}

.management-message.error {
    color: #dc2626;
}

.role-error {
    margin-bottom: 12px;
}

.user-list,
.environment-list {
    margin: 0;
    padding: 0;
    list-style: none;
}

.user-item {
    border-bottom: 1px solid #f1f5f9;
}

.user-item:last-child {
    border-bottom: none;
}

.user-row {
    display: flex;
    align-items: center;
    gap: 10px;

    width: 100%;
    padding: 12px 8px;
    border: none;
    border-radius: 8px;

    background: none;
    font: inherit;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
}

.user-row:hover {
    background: #f8fafc;
}

.user-chevron {
    color: #94a3b8;
    font-size: 11px;
    transition: transform 0.15s;
}

.user-chevron.expanded {
    transform: rotate(90deg);
}

.user-email {
    flex: 1;

    color: #1e293b;
    font-weight: 500;
}

.you-label {
    color: #94a3b8;
    font-size: 12px;
}

.user-details {
    display: flex;
    flex-direction: column;
    gap: 6px;

    margin: 0 8px 12px 29px;
    padding: 12px 14px;
    border-radius: 10px;

    background: #f8fafc;
}

.organisation-role {
    display: flex;
    align-items: center;
    justify-content: space-between;

    margin-bottom: 6px;
    padding-bottom: 10px;
    border-bottom: 1px solid #e2e8f0;
}

.details-label {
    color: #64748b;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.details-hint {
    margin: 0;

    color: #64748b;
    font-size: 12px;
}

.role-switch {
    display: inline-flex;
    padding: 2px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;

    background: #ffffff;
}

.role-switch button {
    padding: 3px 10px;
    border: none;
    border-radius: 6px;

    background: none;
    color: #64748b;
    font: inherit;
    font-size: 12px;
    text-transform: capitalize;
    cursor: pointer;
}

.role-switch button.active {
    background: #eef2ff;
    color: #4f46e5;
    font-weight: 600;
    cursor: default;
}

.environment-row {
    display: flex;
    align-items: center;
    gap: 8px;

    padding: 6px 0;
    font-size: 13px;
}

.environment-icon {
    color: #94a3b8;
    font-size: 12px;
}

.environment-name {
    flex: 1;
    color: #334155;
}

.role-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;

    font-size: 12px;
    font-weight: 500;
    text-transform: capitalize;
}

.role-badge.admin {
    background: #ede9fe;
    color: #6d28d9;
}

.role-badge.editor {
    background: #dbeafe;
    color: #1d4ed8;
}

.role-badge.viewer,
.role-badge.member {
    background: #f1f5f9;
    color: #475569;
}
</style>
