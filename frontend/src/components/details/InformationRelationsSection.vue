<script setup lang="ts">
    import { computed, ref, watch } from 'vue';
    import { useConnectionStore } from '../../stores/connection.store';
    import { useInformationRelationStore, type ResourceRelation } from '../../stores/information/informationRelation.store';
    import { useResourceService } from '../../services/resources/resource.service';
    import { useInformationSourceService } from '../../services/informationSource.service';
    import { byLabel, useConnectionEndOptions } from '../../services/connectionEndOptions.service';
    import type { ConnectionEnd, ConnectionEndTarget, InformationFieldToAdd, InformationObjectToAdd } from '../../types/connectionEnd.types';
    import type { Connection, PartType } from '../../types/connection.types';
    import ConnectedResourcesSection from './ConnectedResourcesSection.vue';

    // What a resource receives from other resources (incoming) or sends to them (outgoing), in the same way as what a
    // script reads from and writes to. The rows are the resources it is connected to, with the information of the
    // relations between them, so the 'Sends to' of one resource and the 'Receives from' of the other always agree.
    // - an application or external element is connected per connection: first how the information gets there (an api
    //   of the sender, by hand, a file, ...), then what goes through it. Picking it makes an 'unknown' connection, shown
    //   as a dashed line, until it is known how
    // - a database is connected per table, through its database connection
    // - a file location as a whole, through a file connection
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

    // Applications and external elements are connected per connection
    function isPerConnection(resourceId: string) {
        const type = resourceService.getResource(resourceId)?.type;
        return type === 'application' || type === 'external';
    }

    // Tables picked without information yet
    const pending = ref<ConnectionEndTarget[]>([]);
    watch(() => props.resourceId, () => { pending.value = []; });

    const ends = computed<RelationEnd[]>(() => {
        const byKey = new Map<string, RelationEnd>();

        function getEnd(target: ConnectionEndTarget) {
            const key = `${target.resourceId}:${target.connectionId ?? ''}`;
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

        // The end of a connection: its own part for an application or external element, otherwise the resource
        function getConnectionEnd(otherId: string, connection: Connection | undefined) {
            if (!connection || !isPerConnection(otherId)) return getEnd({ resourceId: otherId, componentId: null });
            return getEnd({
                resourceId: otherId,
                componentId: null,
                connectionId: connection.id,
                connectionKind: connection.kind,
                apiId: connection.kind === 'api' ? connection.apiId : null
            });
        }

        function addRelation(relation: ResourceRelation, kind: 'field' | 'object', informationId: string) {
            const otherId = getOtherId(relation.sourceResourceId, relation.targetResourceId);
            if (!otherId || relation.scriptId) return;
            const end = getConnectionEnd(otherId, connectionStore.getConnection(relation.connectionId));
            const ids = kind === 'field' ? end.informationFieldIds : end.informationObjectIds;
            const relationIds = kind === 'field' ? end.fieldRelationIds : end.objectRelationIds;
            if (!ids.includes(informationId)) ids.push(informationId);
            relationIds.set(informationId, [...(relationIds.get(informationId) ?? []), relation.id]);
        }

        // The connections first, so they keep their order when information is added
        for (const connection of connectionStore.connections) {
            const otherId = getOtherId(connection.source.id, connection.target.id);
            if (otherId) getConnectionEnd(otherId, connection);
        }
        informationRelationStore.fieldRelations.forEach(relation => addRelation(relation, 'field', relation.informationFieldId));
        informationRelationStore.objectRelations.forEach(relation => addRelation(relation, 'object', relation.informationObjectId));

        pending.value.forEach(getEnd);
        return [...byKey.values()];
    });

    // <-- What can go on an end -->

    // Received: what the end can pass on, through its api when it has one. Sent: what this resource can pass on, through
    // its api when it has one; a table only takes fields
    function getSenderEnd(end: ConnectionEnd): ConnectionEnd {
        return isIncoming.value ? end : { ...end, resourceId: props.resourceId, componentId: null };
    }

    function getFieldOptions(end: ConnectionEnd) {
        return byLabel(getEndFieldOptions(getSenderEnd(end)));
    }

    function getObjectOptions(end: ConnectionEnd) {
        if (!isIncoming.value && resourceService.getResource(end.resourceId)?.type === 'table') return [];
        return byLabel(getEndObjectOptions(getSenderEnd(end)));
    }

    const texts = computed(() => isIncoming.value
        ? {
            title: 'Receives from',
            addPlaceholder: '+ Receives from…',
            emptyText: 'Nothing received yet',
            informationEmptyText: 'Nothing received through this yet',
            fieldOptionsEmpty: 'This sends no fields',
            objectOptionsEmpty: 'This sends no objects'
        }
        : {
            title: 'Sends to',
            addPlaceholder: '+ Sends to…',
            emptyText: 'Nothing sent yet',
            informationEmptyText: 'Nothing sent through this yet',
            fieldOptionsEmpty: 'No output fields to send this way',
            objectOptionsEmpty: 'No output objects to send this way, or this only takes fields'
        });

    // <-- Changes -->

    function toPart(resourceId: string) {
        return { id: resourceId, type: resourceService.getResource(resourceId)?.type as PartType };
    }

    // Picking a resource connects the two. Choosing how makes the connection: the empty 'unknown' connection between
    // the two becomes it, otherwise it is added next to the others
    async function connect(target: ConnectionEndTarget) {
        const [sourceId, targetId] = getEnds(target.resourceId);

        if (!target.connectionKind) {
            if (resourceService.getResource(target.resourceId)?.type === 'table') pending.value = [...pending.value, target];
            await connectionStore.connectParts(sourceId, targetId);
            return;
        }

        const method = target.connectionKind === 'api'
            ? { kind: 'api' as const, apiId: target.apiId! }
            : { kind: target.connectionKind };
        const emptyUnknown = ends.value.find(end =>
            end.resourceId === target.resourceId && end.connectionKind === 'unknown' &&
            end.informationFieldIds.length + end.informationObjectIds.length === 0
        );
        if (emptyUnknown?.connectionId) {
            await connectionStore.updateConnection(emptyUnknown.connectionId, method);
            return;
        }
        await connectionStore.createConnection({ ...method, source: toPart(sourceId), target: toPart(targetId) } as Parameters<typeof connectionStore.createConnection>[0]);
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

    // A connection, with what goes through it, or a table of a database
    async function removeEnd(index: number) {
        const end = ends.value[index];
        if (!end) return;
        if (end.connectionId) {
            await connectionStore.deleteConnection(end.connectionId);
            return;
        }
        pending.value = pending.value.filter(target => target.resourceId !== end.resourceId);
        await informationRelationStore.removeRelations(getRelations(end));
    }

    // Only existing information is received or sent: new information is made in the inputs or outputs
    async function addInformation(index: number, kind: 'field' | 'object', informationId: string) {
        const end = ends.value[index];
        if (!end) return;
        const [sourceResourceId, targetResourceId] = getEnds(end.resourceId);
        await informationRelationStore.addRelation({ kind, informationId, sourceResourceId, targetResourceId, connectionId: end.connectionId ?? null });
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

    // <-- How a connection works, changed in its part -->
    function changeMethod(connection: Connection, key: string) {
        const option = informationSourceService.getMethodOptions(connection.source.id).find(option => option.key === key);
        if (!option) return;
        connectionStore.updateConnection(connection.id, option.kind === 'api' ? { kind: 'api', apiId: option.apiId! } : { kind: option.kind as Exclude<typeof option.kind, 'api'> });
    }

    function changeDescription(connection: Connection, description: string) {
        if (description !== connection.description) connectionStore.updateConnection(connection.id, { description });
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
        connection-parts
        :api-owner-id="isIncoming ? undefined : resourceId"
        :file-parts="false"
        :exclude-resource-id="resourceId"
        @connect="connect"
        @disconnect="disconnect"
        @remove-end="removeEnd"
        @add-field="addField"
        @remove-field="(index, id) => removeInformation(index, 'field', id)"
        @add-object="addObject"
        @remove-object="(index, id) => removeInformation(index, 'object', id)"
    >
        <template #part-settings="{ end }">
            <template v-if="connectionStore.getConnection(end.connectionId)">
                <label class="method-setting">
                    <span>How</span>
                    <select
                        class="detail-select"
                        :class="{ unknown: end.connectionKind === 'unknown' }"
                        :value="informationSourceService.getMethodKey(connectionStore.getConnection(end.connectionId)!)"
                        @change="changeMethod(connectionStore.getConnection(end.connectionId)!, ($event.target as HTMLSelectElement).value)"
                    >
                        <option
                            v-for="option in informationSourceService.getMethodOptions(connectionStore.getConnection(end.connectionId)!.source.id)"
                            :key="option.key"
                            :value="option.key"
                        >
                            {{ option.label }}
                        </option>
                    </select>
                </label>
                <label class="method-setting">
                    <span>Description</span>
                    <input
                        :value="connectionStore.getConnection(end.connectionId)!.description"
                        type="text"
                        class="detail-input"
                        placeholder="e.g. weekly export"
                        @change="changeDescription(connectionStore.getConnection(end.connectionId)!, ($event.target as HTMLInputElement).value)"
                    />
                </label>
            </template>
        </template>
    </ConnectedResourcesSection>
</template>

<style scoped>
.method-setting {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;

    color: #64748b;
    font-size: 11px;
}

.method-setting > span {
    flex: 0 0 70px;
}

.method-setting .detail-select,
.method-setting .detail-input {
    flex: 1;
    min-width: 0;
}

/* Nobody knows yet how it gets there */
.method-setting .detail-select.unknown {
    border-color: #fcd34d;
    background: #fffbeb;
    color: #b45309;
}
</style>
