<script setup lang="ts">
import { computed } from 'vue';

import type { InformationChain } from '../services/informationChain.service';
import InformationChainBranch from './InformationChainBranch.vue';

// The chain(s) of one piece of information, with its breaks
const props = defineProps<{
    chain: InformationChain;
}>();

// Breaks that belong to the information as a whole, or to a step that is not part of any chain
const groupBreaks = computed(() => {
    const shownStepKeys = new Set(
        props.chain.chains.flatMap(chain => chain.steps.flatMap(step => step.breaks.map(chainBreak => chainBreak.stepKey)))
    );
    return props.chain.breaks.filter(chainBreak => !chainBreak.stepKey || !shownStepKeys.has(chainBreak.stepKey));
});
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
        Not in any resource yet
        <template v-if="chain.containingObjectNames.length">
            · part of {{ chain.containingObjectNames.join(', ') }}
        </template>
    </div>

    <div
        v-for="(branch, branchIndex) in chain.branches"
        :key="branchIndex"
        class="chain"
    >
        <InformationChainBranch :branch="branch" />
    </div>
</template>

<style scoped>
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

/* A step cannot wrap below the one before it without losing the rows of a split, so a long chain scrolls */
.chain {
    padding: 3px 0 3px 10px;
    overflow-x: auto;
}

.empty-row {
    padding: 4px 0 4px 10px;
    color: var(--p-text-muted-color);
    font-size: 11px;
    font-style: italic;
}
</style>
