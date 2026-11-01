<script setup lang="ts">
import { computed } from 'vue';

import { useInformationChainService, type ChainBranch } from '../services/informationChain.service';

// One step of a chain and everything after it. With more than one next step the chain splits here:
// the first goes on in the same row, the others each get a row of their own below it
const props = defineProps<{
    branch: ChainBranch;
}>();

const informationChainService = useInformationChainService();

const step = computed(() => props.branch.step);
const hasError = computed(() => step.value.breaks.some(chainBreak => chainBreak.severity === 'error'));

const stepTitle = computed(() => {
    if (step.value.breaks.length) return step.value.breaks.map(chainBreak => chainBreak.message).join('\n');
    if (step.value.isSource) return 'Source: the information originates here';
    if (step.value.endpointId) return 'Endpoint: the information is used here';
    if (step.value.componentId) return 'Script: moves the information to the next resource';
    return undefined;
});
</script>

<template>
    <div class="branch">
        <span
            class="chain-step"
            :class="{
                'in-object': step.objectNames.length,
                endpoint: step.endpointId,
                script: step.componentId,
                broken: hasError,
                warned: step.breaks.length && !hasError,
                source: step.isSource
            }"
            :title="stepTitle"
        >
            <span class="step-label">
                <i
                    v-if="step.breaks.length"
                    :class="hasError ? 'pi pi-times-circle' : 'pi pi-exclamation-triangle'"
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

        <div
            v-if="branch.children.length"
            class="branch-children"
        >
            <div
                v-for="(child, childIndex) in branch.children"
                :key="childIndex"
                class="branch-row"
                :class="{ split: branch.children.length > 1 }"
            >
                <span
                    class="chain-link"
                    :class="{ 'via-object': child.link?.objectNames.length, unconnected: child.link?.unconnected }"
                    :title="child.link?.unconnected ? 'Not known yet how the information gets here from the source' : undefined"
                >
                    <span class="chain-arrow">
                        <span
                            v-if="child.link?.unconnected"
                            class="unconnected-label"
                        >
                            <i class="pi pi-exclamation-triangle" />
                            Connection unknown
                        </span>
                    </span>
                    <span
                        v-if="child.link?.objectNames.length"
                        class="link-label"
                    >
                        {{ child.link.objectNames.join(', ') }}
                    </span>
                </span>

                <InformationChainBranch :branch="child" />
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Every step has the same height, so the arrows and the lines of a split all run through the middle of it */
.branch {
    --step-height: 24px;
    --row-gap: 6px;

    display: flex;
    align-items: flex-start;
    width: max-content;
}

.branch-children {
    display: flex;
    flex-direction: column;
}

.branch-row {
    position: relative;
    display: flex;
    align-items: flex-start;
}

.branch-row + .branch-row {
    padding-top: var(--row-gap);
}

/* The line down from where the chain splits, past the rows in between, to the last row */
.branch-row.split::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 6px;
    border-left: 1px solid var(--p-text-muted-color);
}

.branch-row.split:first-child::before {
    top: calc(var(--step-height) / 2 - 0.5px);
}

.branch-row.split:last-child::before {
    bottom: auto;
    height: calc(var(--row-gap) + var(--step-height) / 2 + 0.5px);
}

.chain-link {
    display: flex;
    flex-direction: column;
    padding: 0 6px;
    color: var(--p-text-muted-color);
}

.chain-link.via-object {
    color: var(--p-primary-color);
}

/* A broken arrow: the information has to get there from the source, but it is not known how yet */
.chain-link.unconnected {
    color: #d97706;
}

.chain-link.unconnected .chain-arrow::before {
    border-top-style: dashed;
}

/* Sits on the arrow, with the arrow running out on both sides of it */
.unconnected-label {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 4px;

    height: 18px;
    margin: 0 14px 0 8px;
    padding: 0 6px;
    border: 1px solid #fcd34d;
    border-radius: 9px;
    background: #fffbeb;

    color: #92400e;
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
}

.unconnected-label .pi {
    color: #d97706;
    font-size: 10px;
}

.chain-arrow {
    position: relative;
    display: flex;
    align-items: center;
    min-width: 18px;
    height: var(--step-height);
}

.chain-arrow::before {
    content: '';
    position: absolute;
    top: calc(var(--step-height) / 2 - 0.5px);
    right: 2px;
    left: 0;
    border-top: 1px solid currentColor;
}

.chain-arrow::after {
    content: '';
    position: absolute;
    top: calc(var(--step-height) / 2 - 3.5px);
    right: 0;
    border-top: 3.5px solid transparent;
    border-bottom: 3.5px solid transparent;
    border-left: 6px solid currentColor;
}

.link-label {
    color: var(--p-primary-color);
    font-size: 10px;
    line-height: 1;
    text-align: center;
    white-space: nowrap;
}

.chain-step {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 6px;

    box-sizing: border-box;
    height: var(--step-height);
    padding: 0 6px;
    border: 1px solid var(--p-content-border-color);
    border-radius: 4px;
    line-height: 1;
    white-space: nowrap;
}

.step-label {
    display: inline-flex;
    align-items: center;
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

/* The source stays green, whatever is still to be sorted out around it */
.chain-step.source,
.chain-step.source.in-object,
.chain-step.source.broken,
.chain-step.source.warned {
    border-color: #86efac;
    background: #f0fdf4;
    color: #166534;
}
</style>
