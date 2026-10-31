<script setup lang="ts">
import { computed } from 'vue';

import { useInformationChainService, type ChainStepView, type InformationChain } from '../services/informationChain.service';

// The chain(s) of one piece of information, with its breaks
const props = defineProps<{
    chain: InformationChain;
}>();

const informationChainService = useInformationChainService();

// Breaks that belong to the information as a whole, or to a step that is not part of any chain
const groupBreaks = computed(() => {
    const shownStepKeys = new Set(
        props.chain.chains.flatMap(chain => chain.steps.flatMap(step => step.breaks.map(chainBreak => chainBreak.stepKey)))
    );
    return props.chain.breaks.filter(chainBreak => !chainBreak.stepKey || !shownStepKeys.has(chainBreak.stepKey));
});

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
    <div
        v-for="(chainBreak, breakIndex) in groupBreaks"
        :key="breakIndex"
        class="group-break"
        :class="chainBreak.severity"
    >
        <i :class="chainBreak.severity === 'error' ? 'pi pi-times-circle' : 'pi pi-exclamation-triangle'" />
        {{ chainBreak.message }}
    </div>

    <div
        v-if="!chain.chains.length"
        class="empty-row"
    >
        No relations
    </div>

    <div
        v-for="(path, pathIndex) in chain.chains"
        :key="pathIndex"
        class="chain"
    >
        <template
            v-for="(step, stepIndex) in path.steps"
            :key="stepIndex"
        >
            <span
                v-if="stepIndex > 0"
                class="chain-link"
                :class="{ 'via-object': path.links[stepIndex - 1]?.objectNames.length }"
            >
                <span
                    v-if="path.links[stepIndex - 1]?.objectNames.length"
                    class="link-label"
                >
                    {{ path.links[stepIndex - 1]?.objectNames.join(', ') }}
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
    padding: 4px 0 4px 10px;
    color: var(--p-text-muted-color);
    font-size: 11px;
    font-style: italic;
}
</style>
