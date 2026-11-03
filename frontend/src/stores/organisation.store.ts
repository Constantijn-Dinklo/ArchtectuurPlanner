import { defineStore } from "pinia";
import { ref } from "vue";
import api from "../helpers/axios";
import type { Environment } from "./environment.store";

// An admin manages the users of the organisation and is admin in every environment of it
export type OrganisationRole = 'admin' | 'member';

export interface OrganisationUser {
    id: string;
    email: string;
    organisationRole: OrganisationRole;
    // An inactive user was removed: it cannot log in, but can be brought back
    isActive: boolean;
    // Every environment of the organisation, with the role of the user in it
    environments: (Pick<Environment, 'id' | 'name' | 'role'>)[];
}

export interface OrganisationUsers {
    organisationName: string;
    currentUserId: string;
    users: OrganisationUser[];
}

export const useOrganisationStore = defineStore('organisation', () => {
    const organisationUsers = ref<OrganisationUsers | null>(null);

    async function fetchUsers() {
        const res = await api.get<OrganisationUsers>('/org/users');
        organisationUsers.value = res.data;
    }

    async function updateOrganisationRole(userId: string, organisationRole: OrganisationRole) {
        const res = await api.patch<OrganisationUsers>(`/org/users/${userId}/role`, { organisationRole });
        organisationUsers.value = res.data;
    }

    async function updateEnvironmentRole(userId: string, environmentId: string, role: Environment['role']) {
        const res = await api.patch<OrganisationUsers>(`/org/users/${userId}/environments/${environmentId}/role`, { role });
        organisationUsers.value = res.data;
    }

    // Removing makes a user inactive; restoring brings it back; deleting an inactive user hides it for everyone
    async function deactivateUser(userId: string) {
        const res = await api.post<OrganisationUsers>(`/org/users/${userId}/deactivate`);
        organisationUsers.value = res.data;
    }

    async function restoreUser(userId: string) {
        const res = await api.post<OrganisationUsers>(`/org/users/${userId}/restore`);
        organisationUsers.value = res.data;
    }

    async function deleteUser(userId: string) {
        const res = await api.delete<OrganisationUsers>(`/org/users/${userId}`);
        organisationUsers.value = res.data;
    }

    return {
        organisationUsers,
        fetchUsers,
        updateOrganisationRole,
        updateEnvironmentRole,
        deactivateUser,
        restoreUser,
        deleteUser
    };
});
