<script setup lang="ts">
    import { computed, ref, watch } from 'vue';
    import { useApiConnectionStore } from '../../stores/apiConnection.store';
    import {
        useInformationRelationStore,
        type ResourceRelation,
        type ViaConnection
    } from '../../stores/information/informationRelation.store';
    import { useResourceService } from '../../services/resources/resource.service';
    import { byLabel, useConnectionEndOptions } from '../../services/connectionEndOptions.service';
    import type { ConnectionEnd, ConnectionEndTarget, InformationFieldToAdd, InformationObjectToAdd } from '../../types/connectionEnd.types';
    import ConnectedResourcesSection from './ConnectedResourcesSection.vue';

    // What a resource receives from other resources (incoming) or sends to them (outgoing), in the same way as what a
    // script reads from and writes to. It is made from the relations between the resources, so the 'Sends to' of one
    // resource and the 'Receives from' of the other always show the same.
    // - an end is the other resource itself, a table of a database, or an api of the source the information is read through
    // - relations via a script belong to the script, so they are not shown here
    // - a resource that is picked but has no information yet is only kept while the panel shows this resource
    const props = defineProps<{
        resourceId: string;
        direction: 'incoming' | 'outgoing';
    }>();

    interface RelationEnd extends ConnectionEnd {
        // The relations per piece of information on this end
        fieldRelationIds: Map<string, string[]>;
        objectRelationIds: Map<string, string[]>;
    }

    const apiConnectionStore = useApiConnectionStore();
    const informationRelationStore = useInformationRelationStore();
    const resourceService = useResourceService();
    const { getEndFieldOptions, getEndObjectOptions } = useConnectionEndOptions();

    const isIncoming = computed(() => props.direction === 'incoming');

    function endKey(end: ConnectionEndTarget) {
        return `${end.resourceId}:${end.componentId ?? ''}:${end.apiId ?? ''}`;
    }

    // The end a relation of this resource goes to or comes from; undefined when it is not one of its relations
    function getEndTarget(relation: ResourceRelation): ConnectionEndTarget | undefined {
        const ownId = isIncoming.value ? relation.targetResourceId : relation.sourceResourceId;
        const otherId = isIncoming.value ? relation.sourceResourceId : relation.targetResourceId;
        if (ownId !== props.resourceId || otherId === props.resourceId || relation.viaConnectionType === 'component') return undefined;

        const apiId = isIncoming.value && relation.viaConnectionType === 'api'
            ? apiConnectionStore.apiConnections.find(connection => connection.id === relation.viaConnectionId)?.sourceUrlId
            : undefined;
        return { resourceId: otherId, componentId: null, apiId: apiId ?? null };
    }

    const pending = ref<ConnectionEndTarget[]>([]);
    watch(() => props.resourceId, () => { pending.value = []; });

    const ends = computed<RelationEnd[]>(() => {
        const byKey = new Map<string, RelationEnd>();

        function getEnd(target: ConnectionEndTarget) {
            const key = endKey(target);
            const end = byKey.get(key) ?? {
                ...target,
                informationFieldIds: [],
                informationObjectIds: [],
                fieldRelationIds: new Map(),
                objectRelationIds: new Map()
            };
            byKey.set(key, end);
            return end;
        }

        function add(ids: string[], relationIds: Map<string, string[]>, informationId: string, relationId: string) {
            if (!ids.includes(informationId)) ids.push(informationId);
            relationIds.set(informationId, [...(relationIds.get(informationId) ?? []), relationId]);
        }

        for (const relation of informationRelationStore.fieldRelations) {
            const target = getEndTarget(relation);
            if (!target) continue;
            const end = getEnd(target);
            add(end.informationFieldIds, end.fieldRelationIds, relation.informationFieldId, relation.id);
        }
        for (const relation of informationRelationStore.objectRelations) {
            const target = getEndTarget(relation);
            if (!target) continue;
            const end = getEnd(target);
            add(end.informationObjectIds, end.objectRelationIds, relation.informationObjectId, relation.id);
        }
        pending.value.forEach(getEnd);

        // Information can always be received from the resource itself, next to its apis
        [...byKey.values()]
            .filter(end => end.apiId)
            .forEach(end => getEnd({ resourceId: end.resourceId, componentId: null }));

        return [...byKey.values()];
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

    function connect(target: ConnectionEndTarget) {
        if (ends.value.some(end => endKey(end) === endKey(target))) return;
        pending.value = [...pending.value, target];
    }

    function getRelations(end: RelationEnd, kind?: 'field' | 'object', informationId?: string) {
        const relations: { kind: 'field' | 'object', id: string }[] = [];
        if (kind !== 'object') {
            end.fieldRelationIds.forEach((ids, id) => {
                if (!informationId || id === informationId) ids.forEach(relationId => relations.push({ kind: 'field', id: relationId }));
            });
        }
        if (kind !== 'field') {
            end.objectRelationIds.forEach((ids, id) => {
                if (!informationId || id === informationId) ids.forEach(relationId => relations.push({ kind: 'object', id: relationId }));
            });
        }
        return relations;
    }

    function forgetPending(isRemoved: (target: ConnectionEndTarget) => boolean) {
        pending.value = pending.value.filter(target => !isRemoved(target));
    }

    // connectionId: the other resource, with every table or api of it
    function belongsTo(target: ConnectionEndTarget, connectionId: string) {
        if (target.resourceId === connectionId) return true;
        const resource = resourceService.getResource(target.resourceId);
        return resource?.type === 'table' && resource.databaseId === connectionId;
    }

    async function disconnect(connectionId: string) {
        const removed = ends.value.filter(end => belongsTo(end, connectionId));
        forgetPending(target => belongsTo(target, connectionId));
        await informationRelationStore.removeRelations(removed.flatMap(end => getRelations(end)));
    }

    async function removeEnd(index: number) {
        const end = ends.value[index];
        if (!end) return;
        forgetPending(target => endKey(target) === endKey(end));
        await informationRelationStore.removeRelations(getRelations(end));
    }

    // Read through an api: the api connection from the source to this resource, made when there is none yet
    async function getApiVia(sourceId: string, apiId: string): Promise<ViaConnection> {
        const existing = apiConnectionStore.apiConnections.find(connection =>
            connection.sourceUrlId === apiId && connection.targetId === props.resourceId && (!connection.sourceId || connection.sourceId === sourceId)
        );
        return { type: 'api', id: existing?.id ?? await apiConnectionStore.createApiConnection(sourceId, apiId, props.resourceId) };
    }

    async function addInformation(index: number, kind: 'field' | 'object', informationId: string) {
        const end = ends.value[index];
        if (!end) return;
        await informationRelationStore.addRelation({
            kind,
            informationId,
            sourceResourceId: isIncoming.value ? end.resourceId : props.resourceId,
            targetResourceId: isIncoming.value ? props.resourceId : end.resourceId,
            via: isIncoming.value && end.apiId ? await getApiVia(end.resourceId, end.apiId) : null
        });
    }

    // Only existing information is received or sent: new information is made in the inputs or outputs
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
        :reads-through-api="isIncoming"
        api-optional
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
