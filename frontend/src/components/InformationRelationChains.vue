<script setup lang="ts">
import { computed, onMounted } from 'vue';

import { useUIStore } from '../stores/canvas/ui.store';
import { useInformationFieldStore } from '../stores/information/informationField.store';
import { useInformationObjectStore } from '../stores/information/informationObject.store';
import { useInformationRelationStore } from '../stores/information/informationRelation.store';
import { useInformationChainService, type InformationChain } from '../services/informationChain.service';
import InformationChainView from './InformationChainView.vue';

const UIStore = useUIStore();
const informationFieldStore = useInformationFieldStore();
const informationObjectStore = useInformationObjectStore();
const informationRelationStore = useInformationRelationStore();
const informationChainService = useInformationChainService();

// The relations are kept up to date by CanvasView; this only makes sure they are fresh when the sheet opens
onMounted(() => {
    informationRelationStore.fetchInformationRelations();
});

const fieldSearch = computed(() => UIStore.informationFieldSearch.trim().toLowerCase());
const objectSearch = computed(() => UIStore.informationObjectSearch.trim().toLowerCase());

const fieldGroups = computed<InformationChain[]>(() => {
    if (!fieldSearch.value) return [];

    return [...informationFieldStore.informationFields.values()]
        .filter(field => field.fieldName.toLowerCase().includes(fieldSearch.value))
        .map(field => informationChainService.getChain('field', field.id))
        .filter(chain => chain !== undefined);
});

const objectGroups = computed<InformationChain[]>(() => {
    if (!objectSearch.value) return [];

    return [...informationObjectStore.informationObjects.values()]
        .filter(object => object.objectName.toLowerCase().includes(objectSearch.value))
        .map(object => informationChainService.getChain('object', object.id))
        .filter(chain => chain !== undefined);
});
</script>

<template>
    <div class="relation-chains">
        <div
            v-if="!fieldSearch && !objectSearch"
            class="empty-row"
        >
            Search an information field or information object to see its relationship chains
        </div>

        <section
            v-for="section in [
                { title: 'Information fields', search: fieldSearch, groups: fieldGroups },
                { title: 'Information objects', search: objectSearch, groups: objectGroups }
            ]"
            v-show="section.search"
            :key="section.title"
        >
            <div class="section-title">
                <span>{{ section.title }}</span>

                <span
                    v-if="section.groups === fieldGroups"
                    class="legend"
                >
                    <span class="legend-step">▱ dashed</span> = inside an information object
                </span>
            </div>

            <div
                v-if="!section.groups.length"
                class="empty-row"
            >
                Nothing found
            </div>

            <div
                v-for="group in section.groups"
                :key="group.id"
                class="chain-group"
            >
                <div class="group-name">
                    {{ group.name }}
                </div>

                <InformationChainView :chain="group" />
            </div>
        </section>
    </div>
</template>

<style scoped>
.relation-chains {
    padding: 4px 14px 12px;
    font-size: 13px;
    color: var(--p-text-color);
}

.section-title {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 8px 0 4px;

    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.legend {
    display: flex;
    align-items: center;
    gap: 4px;

    color: var(--p-text-muted-color);
    font-weight: 400;
    text-transform: none;
    letter-spacing: normal;
}

.legend-step {
    padding: 1px 6px;
    border: 1px dashed var(--p-primary-color);
    border-radius: 4px;
    background: var(--p-content-hover-background);
}

.chain-group {
    margin-bottom: 8px;
}

.group-name {
    font-weight: 600;
}

.empty-row {
    padding: 4px 0;
    color: var(--p-text-muted-color);
    font-size: 11px;
    font-style: italic;
}
</style>
