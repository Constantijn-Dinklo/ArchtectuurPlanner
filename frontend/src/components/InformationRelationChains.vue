<script setup lang="ts">
import { computed, onMounted } from 'vue';

import { useUIStore } from '../stores/canvas/ui.store';
import { useInformationFieldStore } from '../stores/information/informationField.store';
import { useInformationObjectStore } from '../stores/information/informationObject.store';
import { useInformationRelationStore } from '../stores/information/informationRelation.store';
import { useInformationChainService, type ChainStepView, type InformationChain } from '../services/informationChain.service';

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

// Breaks that belong to the information as a whole, or to a step that is not part of any chain
function getGroupBreaks(group: InformationChain) {
    const shownStepKeys = new Set(
        group.chains.flatMap(chain => chain.steps.flatMap(step => step.breaks.map(chainBreak => chainBreak.stepKey)))
    );
    return group.breaks.filter(chainBreak => !chainBreak.stepKey || !shownStepKeys.has(chainBreak.stepKey));
}

function hasError(step: ChainStepView) {
    return step.breaks.some(chainBreak => chainBreak.severity === 'error');
}

function stepTitle(step: ChainStepView) {
    if (step.breaks.length) return step.breaks.map(chainBreak => chainBreak.message).join('\n');
    if (step.endpointId) return 'Endpoint: the information is used here';
    if (step.componentId) return 'Script: moves the information to the next resource';
    return undefined;
}
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
                    <span class="chain-step in-object">▱ dashed</span> = inside an information object
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

                <div
                    v-for="(chainBreak, breakIndex) in getGroupBreaks(group)"
                    :key="breakIndex"
                    class="group-break"
                    :class="chainBreak.severity"
                >
                    <i :class="chainBreak.severity === 'error' ? 'pi pi-times-circle' : 'pi pi-exclamation-triangle'" />
                    {{ chainBreak.message }}
                </div>

                <div
                    v-if="!group.chains.length"
                    class="empty-row"
                >
                    No relations
                </div>

                <div
                    v-for="(chain, chainIndex) in group.chains"
                    :key="chainIndex"
                    class="chain"
                >
                    <template
                        v-for="(step, stepIndex) in chain.steps"
                        :key="stepIndex"
                    >
                        <span
                            v-if="stepIndex > 0"
                            class="chain-link"
                            :class="{ 'via-object': chain.links[stepIndex - 1]?.objectNames.length }"
                        >
                            <span
                                v-if="chain.links[stepIndex - 1]?.objectNames.length"
                                class="link-label"
                            >
                                {{ chain.links[stepIndex - 1]?.objectNames.join(', ') }}
                            </span>
                            <span class="chain-arrow">→</span>
                        </span>

                        <span
                            class="chain-step"
                            :class="{
                                'in-object': step.objectNames.length,
                                endpoint: step.endpointId,
                                script: step.componentId,
                                broken: hasError(step),
                                warned: step.breaks.length && !hasError(step)
                            }"
                            :title="stepTitle(step)"
                        >
                            <span>
                                <i
                                    v-if="step.breaks.length"
                                    :class="hasError(step) ? 'pi pi-times-circle' : 'pi pi-exclamation-triangle'"
                                    class="break-icon"
                                />
                                <i
                                    v-if="informationChainService.getStepIcon(step)"
                                    :class="informationChainService.getStepIcon(step)"
                                    class="endpoint-step-icon"
                                />
                                {{ informationChainService.getStepLabel(step) }}
                            </span>

                            <span
                                v-if="step.objectNames.length"
                                class="step-objects"
                            >
                                ▱ {{ step.objectNames.join(', ') }}
                            </span>
                        </span>
                    </template>
                </div>
            </div>
        </section>
    </div>
</template>

<style scoped>
.chain-step.endpoint {
    border-color: #c4b5fd;
    background: #faf5ff;
    color: #5b21b6;
}

.endpoint-step-icon {
    margin-right: 3px;
    color: #7c3aed;
    font-size: 10px;
}

.chain-step.script {
    border-color: #c7d2fe;
    background: #eef2ff;
    color: #3730a3;
}

.chain-step.script .endpoint-step-icon {
    color: #4f46e5;
}

/* A break in the chain: the information does not (or no longer) get here, or is not where it is sent from */
.chain-step.broken,
.chain-step.in-object.broken {
    border-color: #fca5a5;
    background: #fef2f2;
    color: #b91c1c;
}

.chain-step.broken .endpoint-step-icon,
.chain-step.broken .break-icon {
    color: #dc2626;
}

/* Only warnings at this step: it is unclear how the information gets here */
.chain-step.warned,
.chain-step.in-object.warned {
    border-color: #fcd34d;
    background: #fffbeb;
    color: #92400e;
}

.chain-step.warned .endpoint-step-icon,
.chain-step.warned .break-icon {
    color: #d97706;
}

.break-icon {
    margin-right: 3px;
    font-size: 10px;
}

.group-break {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 1px 0 1px 10px;
    font-size: 11px;
}

.group-break .pi {
    font-size: 10px;
}

.group-break.error {
    color: #b91c1c;
}

.group-break.warning {
    color: #b45309;
}

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

.chain-group {
    margin-bottom: 8px;
}

.group-name {
    font-weight: 600;
}

.chain {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;

    padding: 3px 0 3px 10px;
}

.chain-step {
    display: inline-flex;
    flex-direction: column;

    padding: 1px 6px;
    border: 1px solid var(--p-content-border-color);
    border-radius: 4px;
}

.chain-step.in-object {
    border-style: dashed;
    border-color: var(--p-primary-color);
    background: var(--p-content-hover-background);
}

.step-objects {
    color: var(--p-primary-color);
    font-size: 10px;
}

.chain-link {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
}

.link-label {
    color: var(--p-primary-color);
    font-size: 10px;
    line-height: 1;
}

.chain-arrow {
    color: var(--p-text-muted-color);
}

.chain-link.via-object .chain-arrow {
    color: var(--p-primary-color);
}

.empty-row {
    padding: 4px 0;
    color: var(--p-text-muted-color);
    font-size: 11px;
    font-style: italic;
}

.chain-group .empty-row {
    padding-left: 10px;
}
</style>
