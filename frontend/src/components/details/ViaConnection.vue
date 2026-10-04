<script setup lang="ts">
    import { computed } from 'vue';
    import {
        useInformationRelationStore,
        type ResourceFieldRelation,
        type ResourceObjectRelation
    } from '../../stores/information/informationRelation.store';
    import { useInformationSourceService, type CandidateConnection } from '../../services/informationSource.service';

    // Shows through which connection the information of a relation comes into the target:
    // '(none)', the only connection, or a choice when there are several
    const props = defineProps<{
        relation: ResourceFieldRelation | ResourceObjectRelation;
    }>();

    const informationRelationStore = useInformationRelationStore();
    const informationSourceService = useInformationSourceService();

    const isObjectRelation = computed(() => 'informationObjectId' in props.relation);

    const via = computed(() => informationSourceService.resolveVia(
        props.relation,
        'informationObjectId' in props.relation
            ? { informationObjectId: props.relation.informationObjectId }
            : { informationFieldId: props.relation.informationFieldId }
    ));

    function candidateKey(candidate?: CandidateConnection) {
        return candidate ? `${candidate.type}:${candidate.id}` : '';
    }

    function choose(key: string) {
        const candidate = via.value.candidates.find(option => candidateKey(option) === key);
        const value = candidate ? { type: candidate.type, id: candidate.id } : null;

        if (isObjectRelation.value) {
            informationRelationStore.setObjectRelationVia(props.relation.id, value);
        } else {
            informationRelationStore.setFieldRelationVia(props.relation.id, value);
        }
    }
</script>

<template>
    <span
        v-if="!via.candidates.length"
        class="via none"
        title="This information does not come through any api, script, database or human connection"
    >
        (none)
    </span>

    <span
        v-else-if="via.candidates.length === 1"
        class="via"
        :title="`Comes through ${via.candidates[0]!.label}`"
    >
        via {{ via.candidates[0]!.label }}
    </span>

    <select
        v-else
        class="via-select"
        :class="{ 'needs-choice': via.needsChoice }"
        :value="candidateKey(via.selected)"
        :title="via.needsChoice ? 'This information can come through several connections, select the correct one' : undefined"
        @click.stop
        @change="choose(($event.target as HTMLSelectElement).value)"
    >
        <option value="" disabled>Select connection</option>
        <option
            v-for="candidate in via.candidates"
            :key="candidateKey(candidate)"
            :value="candidateKey(candidate)"
        >
            via {{ candidate.label }}
        </option>
    </select>
</template>

<style scoped>
.via {
    flex: 0 1 auto;
    min-width: 0;
    max-width: 55%;
    overflow: hidden;

    color: #94a3b8;
    font-size: 10px;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.via.none {
    color: #cbd5e1;
    font-style: italic;
}

.via-select {
    flex: 0 1 auto;
    min-width: 0;
    max-width: 55%;
    height: 20px;
    padding: 0 4px;

    border: 1px solid #e2e8f0;
    border-radius: 5px;
    outline: none;
    background: #ffffff;

    color: #64748b;
    font: inherit;
    font-size: 10px;
    cursor: pointer;
}

.via-select:focus {
    border-color: #a5b4fc;
}

.via-select.needs-choice {
    border-color: #fcd34d;
    background: #fffbeb;
    color: #b45309;
}
</style>
