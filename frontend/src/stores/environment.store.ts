import { defineStore } from "pinia";
import { computed, ref } from "vue";
import api from "../helpers/axios";
import { getStoredEnvironmentId, setStoredEnvironmentId } from "../helpers/environment";

// One architecture, owned by an organisation. A user sees the environments of its own organisation
// and the environments it was added to (for example as a consultant)
export interface Environment {
    id: string;
    name: string;
    organisationId: string;
    organisationName: string;
    isOwnOrganisation: boolean;
    role: 'admin' | 'editor' | 'viewer';
}

export interface EnvironmentMember {
    id: string;
    userId: string;
    email: string;
    organisationName: string;
    // The member belongs to another organisation than the one that owns the environment
    isExternal: boolean;
    role: 'admin' | 'editor' | 'viewer';
}

export interface EnvironmentMembers {
    owningOrganisationName: string;
    members: EnvironmentMember[];
}

export const useEnvironmentStore = defineStore('environment', () => {
    const environments = ref<Environment[]>([]);
    const currentEnvironmentId = ref<string | null>(getStoredEnvironmentId());

    const currentEnvironment = computed(() =>
        environments.value.find(environment => environment.id === currentEnvironmentId.value)
    );

    // Loads the environments and makes sure one of them is selected
    async function fetchEnvironments() {
        const res = await api.get<Environment[]>('/environments');
        environments.value = res.data;

        if (!currentEnvironment.value && environments.value.length) {
            const ownEnvironment = environments.value.find(environment => environment.isOwnOrganisation);
            selectEnvironment((ownEnvironment ?? environments.value[0]!).id);
        }
    }

    function selectEnvironment(environmentId: string) {
        currentEnvironmentId.value = environmentId;
        setStoredEnvironmentId(environmentId);
    }

    // All loaded architecture data belongs to the current environment, so switching starts the app fresh
    function switchEnvironment(environmentId: string) {
        if (environmentId === currentEnvironmentId.value) return;
        selectEnvironment(environmentId);
        window.location.reload();
    }

    async function createEnvironment(name: string) {
        const res = await api.post<Environment[]>('/environments', { name });
        environments.value = res.data;
    }

    async function fetchMembers(environmentId: string) {
        const res = await api.get<EnvironmentMembers>(`/environments/${environmentId}/members`);
        return res.data;
    }

    async function addMember(environmentId: string, email: string) {
        const res = await api.post<EnvironmentMembers>(`/environments/${environmentId}/members`, { email });
        return res.data;
    }

    async function removeMember(environmentId: string, memberId: string) {
        const res = await api.delete<EnvironmentMembers>(`/environments/${environmentId}/members/${memberId}`);
        return res.data;
    }

    return {
        environments,
        currentEnvironmentId,
        currentEnvironment,
        fetchEnvironments,
        switchEnvironment,
        createEnvironment,
        fetchMembers,
        addMember,
        removeMember
    };
});
