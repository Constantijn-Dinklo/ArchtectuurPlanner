<script setup lang="ts">
    import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { useEnvironmentStore, type Environment, type EnvironmentMembers } from '../../stores/environment.store';

    // Shows the current environment in the navigation rail. Clicking it opens a panel to switch to another
    // environment (of the own organisation or one the user was added to), create one, and add members
    const environmentStore = useEnvironmentStore();

    const isOpen = ref(false);
    const panel = ref<HTMLElement>();
    const trigger = ref<HTMLElement>();

    const newEnvironmentName = ref('');
    const newMemberEmail = ref('');
    const members = ref<EnvironmentMembers>();
    const message = ref('');

    const initials = computed(() =>
        (environmentStore.currentEnvironment?.name ?? '?')
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(word => word[0]!.toUpperCase())
            .join('')
    );

    // Environments grouped per owning organisation, the own organisation first
    const groups = computed(() => {
        const byOrganisation = new Map<string, { name: string, isOwn: boolean, environments: Environment[] }>();
        for (const environment of environmentStore.environments) {
            const group = byOrganisation.get(environment.organisationId)
                ?? { name: environment.organisationName, isOwn: environment.isOwnOrganisation, environments: [] };
            group.environments.push(environment);
            byOrganisation.set(environment.organisationId, group);
        }
        return [...byOrganisation.values()].sort((a, b) => Number(b.isOwn) - Number(a.isOwn) || a.name.localeCompare(b.name));
    });

    async function loadMembers() {
        if (!environmentStore.currentEnvironmentId) return;
        members.value = await environmentStore.fetchMembers(environmentStore.currentEnvironmentId);
    }

    watch(isOpen, (open) => {
        message.value = '';
        if (open) loadMembers();
    });

    async function createEnvironment() {
        const name = newEnvironmentName.value.trim();
        if (!name) return;
        try {
            await environmentStore.createEnvironment(name);
            newEnvironmentName.value = '';
            message.value = `Created '${name}'`;
        }
        catch (error: any) {
            message.value = error.response?.data?.error ?? 'Could not create the environment';
        }
    }

    async function addMember() {
        const email = newMemberEmail.value.trim();
        if (!email || !environmentStore.currentEnvironmentId) return;
        try {
            members.value = await environmentStore.addMember(environmentStore.currentEnvironmentId, email);
            newMemberEmail.value = '';
            message.value = `${email} now has access`;
        }
        catch (error: any) {
            message.value = error.response?.data?.error ?? 'Could not add the member';
        }
    }

    async function removeMember(memberId: string) {
        if (!environmentStore.currentEnvironmentId) return;
        members.value = await environmentStore.removeMember(environmentStore.currentEnvironmentId, memberId);
    }

    // Clicking outside the panel closes it
    function onDocumentClick(event: MouseEvent) {
        const target = event.target as Node;
        if (!isOpen.value || panel.value?.contains(target) || trigger.value?.contains(target)) return;
        isOpen.value = false;
    }

    onMounted(() => document.addEventListener('mousedown', onDocumentClick));
    onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentClick));
</script>

<template>
    <button
        ref="trigger"
        type="button"
        class="environment-trigger"
        :class="{ open: isOpen }"
        :title="environmentStore.currentEnvironment
            ? `${environmentStore.currentEnvironment.name} (${environmentStore.currentEnvironment.organisationName})`
            : 'Select an environment'"
        @click="isOpen = !isOpen"
    >
        <span class="environment-avatar">{{ initials }}</span>
        <span class="rail-label environment-text">
            <span class="environment-name">{{ environmentStore.currentEnvironment?.name ?? 'No environment' }}</span>
            <span class="environment-organisation">{{ environmentStore.currentEnvironment?.organisationName }}</span>
        </span>
        <i class="pi pi-sort rail-label environment-sort" />
    </button>

    <!-- Outside the rail, so it stays open when the rail collapses -->
    <Teleport to="body">
        <div
            v-if="isOpen"
            ref="panel"
            class="environment-panel"
        >
            <div class="panel-title">Environments</div>

            <div
                v-for="group in groups"
                :key="group.name"
                class="environment-group"
            >
                <div class="group-name">
                    <i :class="group.isOwn ? 'pi pi-building' : 'pi pi-briefcase'" />
                    {{ group.name }}
                    <span v-if="!group.isOwn" class="guest-badge">Guest</span>
                </div>

                <button
                    v-for="environment in group.environments"
                    :key="environment.id"
                    type="button"
                    class="environment-option"
                    :class="{ current: environment.id === environmentStore.currentEnvironmentId }"
                    @click="environmentStore.switchEnvironment(environment.id)"
                >
                    <span class="option-avatar">{{ environment.name.slice(0, 1).toUpperCase() }}</span>
                    <span class="option-name">{{ environment.name }}</span>
                    <i
                        v-if="environment.id === environmentStore.currentEnvironmentId"
                        class="pi pi-check option-check"
                    />
                </button>
            </div>

            <div class="panel-row">
                <input
                    v-model="newEnvironmentName"
                    type="text"
                    class="panel-input"
                    placeholder="+ New environment"
                    @keyup.enter="createEnvironment"
                />
                <button
                    type="button"
                    class="panel-button"
                    title="Create environment"
                    :disabled="!newEnvironmentName.trim()"
                    @click="createEnvironment"
                >
                    <i class="pi pi-plus" />
                </button>
            </div>

            <!-- Members of the current environment: users of other organisations, e.g. consultants -->
            <template v-if="environmentStore.currentEnvironment">
                <div class="panel-title members-title">
                    Access to {{ environmentStore.currentEnvironment.name }}
                </div>

                <div class="members-hint">
                    Everyone in {{ members?.owningOrganisationName ?? environmentStore.currentEnvironment.organisationName }} has access.
                    Add people of other organisations by their e-mail address.
                </div>

                <div
                    v-for="member in members?.members ?? []"
                    :key="member.id"
                    class="member-row"
                >
                    <i class="pi pi-user member-icon" />
                    <span class="member-text">
                        <span class="member-email">{{ member.email }}</span>
                        <span class="member-organisation">{{ member.organisationName }}</span>
                    </span>
                    <span v-if="member.isExternal" class="guest-badge">Guest</span>
                    <button
                        type="button"
                        class="member-remove"
                        title="Remove access"
                        @click="removeMember(member.id)"
                    >
                        ×
                    </button>
                </div>

                <div class="panel-row">
                    <input
                        v-model="newMemberEmail"
                        type="email"
                        class="panel-input"
                        placeholder="+ Add by e-mail"
                        @keyup.enter="addMember"
                    />
                    <button
                        type="button"
                        class="panel-button"
                        title="Give access"
                        :disabled="!newMemberEmail.trim()"
                        @click="addMember"
                    >
                        <i class="pi pi-user-plus" />
                    </button>
                </div>
            </template>

            <div v-if="message" class="panel-message">{{ message }}</div>
        </div>
    </Teleport>
</template>

<style scoped>
.environment-trigger {
    display: flex;
    align-items: center;
    gap: 10px;

    width: 100%;
    min-height: 40px;
    margin-bottom: 10px;
    padding: 4px 2px;
    box-sizing: border-box;

    border: 1px solid #1e293b;
    border-radius: 8px;
    background: #111c33;

    color: #e2e8f0;
    font: inherit;
    text-align: left;
    cursor: pointer;

    transition: background 0.15s ease, border-color 0.15s ease;
}

.environment-trigger:hover,
.environment-trigger.open {
    border-color: #334155;
    background: #1e293b;
}

.environment-avatar {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;

    width: 30px;
    height: 30px;
    border-radius: 7px;

    background: #334155;
    color: #f8fafc;
    font-size: 11px;
    font-weight: 700;
}

.environment-text {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
}

.environment-name {
    overflow: hidden;

    color: #f8fafc;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.environment-organisation {
    overflow: hidden;

    color: #94a3b8;
    font-size: 10px;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.environment-sort {
    flex: 0 0 auto;
    margin-right: 4px;
    color: #64748b;
    font-size: 10px;
}

/* The panel opens next to the rail */
.environment-panel {
    position: fixed;
    top: 56px;
    left: 60px;
    z-index: 1000;

    display: flex;
    flex-direction: column;
    gap: 2px;

    width: 300px;
    max-height: calc(100vh - 80px);
    padding: 12px;
    overflow: auto;
    box-sizing: border-box;

    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18);

    color: #1e293b;
    font-size: 12px;
}

.panel-title {
    margin-bottom: 4px;

    color: #64748b;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.members-title {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid #eef2f7;
}

.environment-group {
    margin-bottom: 6px;
}

.group-name {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 4px 2px;

    color: #475569;
    font-size: 11px;
    font-weight: 600;
}

.group-name .pi {
    color: #94a3b8;
    font-size: 10px;
}

.guest-badge {
    padding: 0 6px;
    border-radius: 999px;

    background: #ede9fe;
    color: #6d28d9;
    font-size: 9px;
    font-weight: 600;
    line-height: 15px;
}

.environment-option {
    display: flex;
    align-items: center;
    gap: 8px;

    width: 100%;
    padding: 5px 6px;

    border: 0;
    border-radius: 7px;
    background: transparent;

    color: #1e293b;
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.environment-option:hover {
    background: #f1f5f9;
}

.environment-option.current {
    background: #eef2ff;
}

.option-avatar {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;

    width: 22px;
    height: 22px;
    border-radius: 6px;

    background: #e2e8f0;
    color: #334155;
    font-size: 10px;
    font-weight: 700;
}

.environment-option.current .option-avatar {
    background: #c7d2fe;
    color: #3730a3;
}

.option-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.option-check {
    color: #4f46e5;
    font-size: 10px;
}

.panel-row {
    display: flex;
    gap: 4px;
    margin-top: 4px;
}

.panel-input {
    flex: 1;
    min-width: 0;
    height: 28px;
    padding: 0 8px;
    box-sizing: border-box;

    border: 1px dashed #e2e8f0;
    border-radius: 6px;
    outline: none;

    color: #1e293b;
    font: inherit;
}

.panel-input:focus {
    border-style: solid;
    border-color: #a5b4fc;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.panel-button {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;

    width: 28px;
    height: 28px;

    border: 0;
    border-radius: 6px;
    background: #4f46e5;

    color: #ffffff;
    font-size: 11px;
    cursor: pointer;
}

.panel-button:disabled {
    cursor: default;
    opacity: 0.4;
}

.members-hint {
    margin-bottom: 4px;

    color: #94a3b8;
    font-size: 11px;
    line-height: 1.4;
}

.member-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px;
    border-radius: 6px;
}

.member-row:hover {
    background: #f8fafc;
}

.member-icon {
    color: #94a3b8;
    font-size: 11px;
}

.member-text {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
}

.member-email {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.member-organisation {
    color: #94a3b8;
    font-size: 10px;
}

.member-remove {
    width: 20px;
    height: 20px;
    padding: 0;

    border: 0;
    border-radius: 5px;
    background: transparent;

    color: #94a3b8;
    font-size: 13px;
    cursor: pointer;
}

.member-remove:hover {
    background: #fee2e2;
    color: #dc2626;
}

.panel-message {
    margin-top: 8px;
    padding: 6px 8px;
    border-radius: 6px;

    background: #f1f5f9;
    color: #475569;
    font-size: 11px;
}
</style>
