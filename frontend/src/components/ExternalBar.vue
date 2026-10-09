<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useExternalStore } from '../stores/resources/external.store';
import { useExternalService } from '../services/resources/external.service';
import { getExternalKindInfo } from '../types/external.types';

const externalStore = useExternalStore();
const externalService = useExternalService();

const newExternalName = ref('');
const expanded = ref(true);

onMounted(() => {
    externalService.fetchExternals();
});

function addExternal() {
    if(!newExternalName.value.trim()) return;
    externalService.createExternal(newExternalName.value.trim());
    newExternalName.value = '';
}

function removeExternal(id: string) {
    externalService.deleteExternal(id);
}
</script>

<!-- Elements outside the domain (company) that information is sent to or read from -->
<template>
    <section class="sidebar-section">
        <button
            type="button"
            class="sidebar-section-header"
            @click="expanded = !expanded"
        >
            <span class="sidebar-section-icon external"><i class="pi pi-globe" /></span>
            <span class="sidebar-section-title">External</span>
            <span class="sidebar-section-count">{{ externalStore.externals.length }}</span>
            <i class="pi pi-chevron-right sidebar-section-chevron" :class="{ expanded }" />
        </button>

        <div v-if="expanded" class="sidebar-section-body">
            <div class="sidebar-add-row">
                <input
                    v-model="newExternalName"
                    type="text"
                    class="sidebar-input"
                    placeholder="New external element"
                    @keyup.enter="addExternal"
                />
                <button
                    type="button"
                    class="sidebar-add-button"
                    title="Add external element"
                    :disabled="!newExternalName.trim()"
                    @click="addExternal"
                >
                    <i class="pi pi-plus" />
                </button>
            </div>

            <div v-if="!externalStore.externals.length" class="sidebar-empty">
                No external elements yet
            </div>

            <ul class="sidebar-list">
                <li
                    v-for="external in externalStore.externals"
                    :key="external.id"
                    class="sidebar-item"
                >
                    <i :class="getExternalKindInfo(external.kind).icon" class="sidebar-sub-icon" />
                    <span class="sidebar-item-name" :title="external.externalOrganisation || undefined">
                        {{ external.name }}
                    </span>

                    <span class="sidebar-item-actions">
                        <button
                            type="button"
                            class="sidebar-icon-button danger"
                            title="Delete external element"
                            @click="removeExternal(external.id)"
                        >
                            <i class="pi pi-trash" />
                        </button>
                    </span>
                </li>
            </ul>
        </div>
    </section>
</template>
