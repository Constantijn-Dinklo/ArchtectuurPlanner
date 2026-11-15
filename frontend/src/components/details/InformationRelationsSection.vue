<script setup lang="ts">
    import { computed, ref, watch } from 'vue';
    import { useConnectionStore } from '../../stores/connection.store';
    import { useInformationRelationStore, type ResourceRelation } from '../../stores/information/informationRelation.store';
    import { useResourceService } from '../../services/resources/resource.service';
    import { useInformationSourceService } from '../../services/informationSource.service';
    import { byLabel, useConnectionEndOptions } from '../../services/connectionEndOptions.service';
    import type { ConnectionEnd, ConnectionEndTarget, InformationFieldToAdd, InformationObjectToAdd } from '../../types/connectionEnd.types';
    import ConnectedResourcesSection from './ConnectedResourcesSection.vue';

    // What a resource receives from other resources (incoming) or sends to them (outgoing), in the same way as what a
    // script reads from and writes to. The rows are the resources it is connected to, with the information of the
    // relations between them, so the 'Sends to' of one resource and the 'Receives from' of the other always agree.
    // - picking a resource connects the two; how (the kind of connection) can be set on the connection afterwards
    // - a database is connected per table
    // - relations through a script belong to the script, so they are not shown here
    // - a table that is picked but has no information yet is only kept while the panel shows this resource
    const props = defineProps<{
        resourceId: string;
        direction: 'incoming' | 'outgoing';
    }>();

    interface RelationEnd extends ConnectionEnd {
        // The relations per piece of information on this end
        fieldRelationIds: Map<string, string[]>;
        objectRelationIds: Map<string, string[]>;
    }

    const connectionStore = useConnectionStore();
    const informationRelationStore = useInformationRelationStore();
    const resourceService = useResourceService();
    const informationSourceService = useInformationSourceService();
    const { getEndFieldOptions, getEndObjectOptions } = useConnectionEndOptions();

    const isIncoming = computed(() => props.direction === 'incoming');

    // [source, target] between this resource and the other one
    function getEnds(otherId: string): [string, string] {
        return isIncoming.value ? [otherId, props.resourceId] : [props.resourceId, otherId];
    }

    // The other end, when the connection or relation goes from source to target in this direction
    function getOtherId(sourceId: string, targetId: string) {
        if (sourceId === targetId) return undefined;
        if (isIncoming.value) return targetId === props.resourceId ? sourceId : undefined;
        return sourceId === props.resourceId ? targetId : undefined;
    }

    // Tables picked without information yet
    const pending = ref<ConnectionEndTarget[]>([]);
    watch(() => props.resourceId, () => { pending.value = []; });

    const ends = computed<RelationEnd[]>(() => {
        const byId = new Map<string, RelationEnd>();

        function getEnd(resourceId: string) {
            const end = byId.get(resourceId) ?? {
                resourceId,
                componentId: null,
                informationFieldIds: [],
                informationObjectIds: [],
                fieldRelationIds: new Map(),
                objectRelationIds: new Map()
            };
            byId.set(resourceId, end);
            return end;
        }

        function addRelation(relation: ResourceRelation, kind: 'field' | 'object', informationId: string) {
            const otherId = getOtherId(relation.sourceResourceId, relation.targetResourceId);
            if (!otherId || relation.scriptId) return;
            const end = getEnd(otherId);
            const ids = kind === 'field' ? end.informationFieldIds : end.informationObjectIds;
            const relationIds = kind === 'field' ? end.fieldRelationIds : end.objectRelationIds;
            if (!ids.includes(informationId)) ids.push(informationId);
            relationIds.set(informationId, [...(relationIds.get(informationId) ?? []), relation.id]);
        }

        informationRelationStore.fieldRelations.forEach(relation => addRelation(relation, 'field', relation.informationFieldId));
        informationRelationStore.objectRelations.forEach(relation => addRelation(relation, 'object', relation.informationObjectId));

        // The connected resources, also when nothing goes between them yet
        for (const connection of connectionStore.connections) {
            const otherId = getOtherId(connection.source.id, connection.target.id);
            if (otherId) getEnd(otherId);
        }

        pending.value.forEach(target => getEnd(target.resourceId));
        return [...byId.values()];
    });

    // <-- What can go on an end -->

    // Received: what the end can pass on. Sent: what this resource can pass on; a table only takes fields
    function getFieldOptions(end: ConnectionEnd) {
        return byLabel(getEndFieldOptions(isIncoming.value ? end : { resourceId: props.resourceId, componentId: null }));
    }

    function getObjectOptions(end: ConnectionEnd) {
        if (isIncoming.value) return byLabel(getEndObjectOptions(end));
        if (resourceService.getResource(end.resourceId)?.type === 'table') return [];
        return byLabel(getEndObjectOptions({ resourceId: props.resourceId, componentId: null }));
    }

    const texts = computed(() => isIncoming.value
        ? {
            title: 'Receives from',
            addPlaceholder: '+ Receives from…',
            emptyText: 'Nothing received yet',
            informationEmptyText: 'Nothing received from this yet',
            fieldOptionsEmpty: 'This has no fields to send',
            objectOptionsEmpty: 'This has no objects to send'
        }
        : {
            title: 'Sends to',
            addPlaceholder: '+ Sends to…',
            emptyText: 'Nothing sent yet',
            informationEmptyText: 'Nothing sent to this yet',
            fieldOptionsEmpty: 'Add output fields first',
            objectOptionsEmpty: 'No output objects to send, or this only takes fields'
        });

    // <-- Changes -->

    async function connect(target: ConnectionEndTarget) {
        if (resourceService.getResource(target.resourceId)?.type === 'table') pending.value = [...pending.value, target];
        await connectionStore.connectParts(...getEnds(target.resourceId));
    }

    // connectionId: the other resource. Its connections go, with everything that goes through them
    async function disconnect(connectionId: string) {
        pending.value = pending.value.filter(target => {
            const resource = resourceService.getResource(target.resourceId);
            return !(resource?.type === 'table' && resource.databaseId === connectionId);
        });
        const [sourceId, targetId] = getEnds(connectionId);
        for (const connection of informationSourceService.getCarryingConnections(sourceId, targetId)) {
            await connectionStore.deleteConnection(connection.id);
        }
    }

    function getRelations(end: RelationEnd, kind?: 'field' | 'object', informationId?: string) {
        const relations: { kind: 'field' | 'object', id: string }[] = [];
        const collect = (relationIds: Map<string, string[]>, relationKind: 'field' | 'object') => relationIds.forEach((ids, id) => {
            if (!informationId || id === informationId) ids.forEach(relationId => relations.push({ kind: relationKind, id: relationId }));
        });
        if (kind !== 'object') collect(end.fieldRelationIds, 'field');
        if (kind !== 'field') collect(end.objectRelationIds, 'object');
        return relations;
    }

    // A table of a database
    async function removeEnd(index: number) {
        const end = ends.value[index];
        if (!end) return;
        pending.value = pending.value.filter(target => target.resourceId !== end.resourceId);
        await informationRelationStore.removeRelations(getRelations(end));
    }

    // Only existing information is received or sent: new information is made in the inputs or outputs
    async function addInformation(index: number, kind: 'field' | 'object', informationId: string) {
        const end = ends.value[index];
        if (!end) return;
        const [sourceResourceId, targetResourceId] = getEnds(end.resourceId);
        await informationRelationStore.addRelation({ kind, informationId, sourceResourceId, targetResourceId });
    }

    function addField(index: number, information: InformationFieldToAdd) {
        if ('informationFieldId' in information) addInformation(index, 'field', information.informationFieldId);
    }

    function addObject(index: number, information: InformationObjectToAdd) {
        if ('informationObjectId' in information) addInformation(index, 'object', information.informationObjectId);
    }

    function removeInformation(index: number, kind: 'field' | 'object', informationId: string) {
        const end = ends.value[index];
        if (end) informationRelationStore.removeRelations(getRelations(end, kind, informationId));
    }
</script>

<template>
    <ConnectedResourcesSection
        :title="texts.title"
        :add-placeholder="texts.addPlaceholder"
        :empty-text="texts.emptyText"
        :information-empty-text="texts.informationEmptyText"
        :ends="ends"
        :get-field-options="getFieldOptions"
        :get-object-options="getObjectOptions"
        :field-options-empty="texts.fieldOptionsEmpty"
        :object-options-empty="texts.objectOptionsEmpty"
        :file-parts="false"
        :exclude-resource-id="resourceId"
        @connect="connect"
        @disconnect="disconnect"
        @remove-end="removeEnd"
        @add-field="addField"
        @remove-field="(index, id) => removeInformation(index, 'field', id)"
        @add-object="addObject"
        @remove-object="(index, id) => removeInformation(index, 'object', id)"
    />
</template>
