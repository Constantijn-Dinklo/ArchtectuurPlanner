<script setup lang="ts">
    import { computed } from 'vue';
    import {
        useInformationRelationStore,
        type ResourceFieldRelation,
        type ResourceObjectRelation
    } from '../../stores/information/informationRelation.store';
    import { useConnectionStore } from '../../stores/connection.store';
    import { useInformationSourceService } from '../../services/informationSource.service';

    // Shows through which connection the information of a relation comes into the target, with a choice when there
    // are several connections between the two. A connection of which nobody knows how it works yet gets a warning
    const props = defineProps<{
        relation: ResourceFieldRelation | ResourceObjectRelation;
    }>();

    const informationRelationStore = useInformationRelationStore();
    const connectionStore = useConnectionStore();
    const informationSourceService = useInformationSourceService();

    const connection = computed(() => connectionStore.getConnection(props.relation.connectionId));
    const isUnknown = computed(() => connection.value?.kind === 'unknown');
    const label = computed(() => informationSourceService.describeRelationRoute(props.relation));

    // A script decides itself what it carries, so its relations cannot move
    const candidates = computed(() =>
        informationSourceService.getCarryingConnections(props.relation.sourceResourceId, props.relation.targetResourceId)
    );

    function choose(connectionId: string) {
        informationRelationStore.setRelationConnection('informationObjectId' in props.relation ? 'object' : 'field', props.relation.id, connectionId);
    }
</script>

<template>
    <select
        v-if="candidates.length > 1"
        class="via-select"
        :class="{ unknown: isUnknown }"
        :value="relation.connectionId ?? ''"
        title="The connection this information comes through"
        @click.stop
        @change="choose(($event.target as HTMLSelectElement).value)"
    >
        <option
            v-for="candidate in candidates"
            :key="candidate.id"
            :value="candidate.id"
        >
            via {{ informationSourceService.describeConnection(candidate) }}
        </option>
    </select>

    <span
        v-else-if="label"
        class="via"
        :class="{ unknown: isUnknown }"
        :title="isUnknown ? 'It is not known yet how this information gets here' : `Comes through ${label}`"
    >
        <i v-if="isUnknown" class="pi pi-exclamation-triangle" />
        via {{ label }}
    </span>
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

/* A warning: the information gets here, but nobody knows how yet */
.via.unknown {
    color: #d97706;
}

.via.unknown .pi {
    font-size: 9px;
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

.via-select.unknown {
    border-color: #fcd34d;
    background: #fffbeb;
    color: #b45309;
}
</style>
