<script setup lang="ts">
    import { computed, ref, watch } from 'vue';
    import { useConnectionStore } from '../../stores/connection.store';
    import { useInformationRelationStore, type ResourceRelation } from '../../stores/information/informationRelation.store';
    import { usePartService } from '../../services/part.service';
    import { useInformationSourceService } from '../../services/informationSource.service';
    import { byLabel, useConnectionEndOptions } from '../../services/connectionEndOptions.service';
    import { Select } from 'primevue';
    import { useConnectionParts, type PartOption } from '../../services/connectionParts.service';
    import type { ConnectionEnd, ConnectionEndTarget, InformationFieldToAdd, InformationObjectToAdd } from '../../types/connectionEnd.types';
    import type { Connection, ConnectionInput, ConnectionKind, PartType } from '../../types/connection.types';
    import ConnectedResourcesSection from './ConnectedResourcesSection.vue';

    // What an application or script receives from other parts (incoming) or sends to them (outgoing). For a script it
    // is called Reads from and Writes to, but it works the same. The rows are the parts it is connected to, with the
    // information of the relations between them, so the 'Sends to' of one and the 'Receives from' of the other agree.
    // - an application, external element or script has a part per connection: how the information gets there (an api
    //   of the sender, by hand, ...), with what goes through it. Picking it connects the two without a way yet (an
    //   undecided connection, a dashed line), which is not shown as a part: like a database without a table chosen
    // - a database is connected per table, through its database connection
    // - a file location per file, through a file connection
    // - a table or file that is picked but has no information yet is only kept while the panel shows this resource
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
    const partService = usePartService();
    const informationSourceService = useInformationSourceService();
    const { getEndFieldOptions, getEndObjectOptions } = useConnectionEndOptions();
    const connectionParts = useConnectionParts();

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

    // Applications, external elements and scripts are connected per connection
    function isPerConnection(partId: string) {
        const type = partService.getPart(partId)?.type;
        return type === 'application' || type === 'external' || type === 'script';
    }

    const isScript = computed(() => partService.getPart(props.resourceId)?.type === 'script');

    // Tables and files picked without information yet
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

        // The end of a connection: its own part for an application or external element, otherwise the resource. An
        // undecided connection only shows the resource
        function getConnectionEnd(otherId: string, connection: Connection | undefined) {
            if (!connection || connection.kind === 'undecided' || !isPerConnection(otherId)) return getEnd({ resourceId: otherId });
            return getEnd({
                resourceId: otherId,
                connectionId: connection.id,
                connectionKind: connection.kind,
                apiId: connection.kind === 'api' ? connection.apiId : null
            });
        }

        function addRelation(relation: ResourceRelation, kind: 'field' | 'object', informationId: string) {
            const otherId = getOtherId(relation.sourceResourceId, relation.targetResourceId);
            if (!otherId) return;
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

    // An application or external element has the ways information goes as its parts, through an api of the sender
    function getPartSpec(otherId: string, partEnds: ConnectionEnd[]) {
        const senderId = isIncoming.value ? otherId : props.resourceId;
        return connectionParts.forResource(otherId, partEnds, () => connectionParts.connectionTypes(otherId, senderId, partEnds));
    }

    // <-- What can go on an end -->

    // Received: what the end can pass on, through its api when it has one. Sent: what this resource can pass on, through
    // its api when it has one; a table only takes fields
    function getSenderEnd(end: ConnectionEnd): ConnectionEnd {
        return isIncoming.value ? end : { ...end, resourceId: props.resourceId };
    }

    function getFieldOptions(end: ConnectionEnd) {
        return byLabel(getEndFieldOptions(getSenderEnd(end)));
    }

    function getObjectOptions(end: ConnectionEnd) {
        if (!isIncoming.value && partService.getPart(end.resourceId)?.type === 'table') return [];
        return byLabel(getEndObjectOptions(getSenderEnd(end)));
    }

    // A script reads and writes, an application receives and sends
    const texts = computed(() => {
        if (isIncoming.value) {
            const verb = isScript.value ? 'Reads from' : 'Receives from';
            return {
                title: verb,
                addPlaceholder: `+ ${verb}…`,
                emptyText: isScript.value ? 'Nothing read yet' : 'Nothing received yet',
                informationEmptyText: isScript.value ? 'Nothing read through this yet' : 'Nothing received through this yet',
                fieldOptionsEmpty: 'This sends no fields',
                objectOptionsEmpty: 'This sends no objects'
            };
        }
        const verb = isScript.value ? 'Writes to' : 'Sends to';
        return {
            title: verb,
            addPlaceholder: `+ ${verb}…`,
            emptyText: isScript.value ? 'Nothing written yet' : 'Nothing sent yet',
            informationEmptyText: isScript.value ? 'Nothing written through this yet' : 'Nothing sent through this yet',
            fieldOptionsEmpty: 'No output fields to send this way',
            objectOptionsEmpty: 'No output objects to send this way, or this only takes fields'
        };
    });

    // <-- Changes -->

    function toPart(partId: string) {
        return { id: partId, type: partService.getPart(partId)?.type as PartType };
    }

    // The connections between this resource and the other one, in this direction
    function getConnectionsWith(otherId: string) {
        const [sourceId, targetId] = getEnds(otherId);
        return informationSourceService.getCarryingConnections(sourceId, targetId);
    }

    // Picking a resource connects the two: undecided between applications and external elements, otherwise the
    // database or file connection. The first way chosen fills in the undecided connection, every next way is a
    // connection of its own
    async function connect(target: ConnectionEndTarget) {
        const [sourceId, targetId] = getEnds(target.resourceId);

        if (!target.connectionKind) {
            if (partService.getContainerId(target.resourceId)) pending.value = [...pending.value, target];
            await connectionStore.connectParts(sourceId, targetId);
            return;
        }

        const method = target.connectionKind === 'api'
            ? { kind: 'api' as const, apiId: target.apiId! }
            : { kind: target.connectionKind as Exclude<ConnectionKind, 'api'> };
        const undecided = getConnectionsWith(target.resourceId).find(connection => connection.kind === 'undecided');
        if (undecided) {
            await connectionStore.updateConnection(undecided.id, method);
            return;
        }
        await connectionStore.createConnection({ ...method, source: toPart(sourceId), target: toPart(targetId) } as ConnectionInput);
    }

    // connectionId: the other resource. Its connections go, with everything that goes through them
    async function disconnect(connectionId: string) {
        pending.value = pending.value.filter(target => partService.getContainerId(target.resourceId) !== connectionId);
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

    // A connection, with what goes through it, or a table of a database or file of a file location. Like a database without tables, the two stay
    // connected without a way chosen when the last way goes: the resource itself is removed with its own row
    async function removeEnd(index: number) {
        const end = ends.value[index];
        if (!end) return;
        if (end.connectionId) {
            const isLast = getConnectionsWith(end.resourceId).length === 1;
            await connectionStore.deleteConnection(end.connectionId);
            if (isLast) await connectionStore.connectParts(...getEnds(end.resourceId));
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

    // <-- An unknown way, filled in once it is known: the same connection, so what goes through it stays -->
    // The same two dropdowns as for a new way: an api of the sender, or another way that is known
    function getUnknownPickers(end: ConnectionEnd) {
        const partEnds = ends.value.filter(candidate => candidate.resourceId === end.resourceId && candidate.connectionId);
        return getPartSpec(end.resourceId, partEnds).pickers.map(picker => ({
            ...picker,
            options: picker.options.filter(option => option.target.connectionKind !== 'unknown')
        }));
    }

    function decideUnknown(connection: Connection, option: PartOption | undefined) {
        const kind = option?.target.connectionKind;
        if (!kind) return;
        connectionStore.updateConnection(connection.id, kind === 'api'
            ? { kind: 'api', apiId: option.target.apiId! }
            : { kind: kind as Exclude<ConnectionKind, 'api'> });
    }

    // <-- The description of a connection, changed in its part -->
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
        :get-part-spec="getPartSpec"
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
            <!-- How it goes is the part itself: another way is a connection of its own. Only an unknown way can still be
                 filled in, once someone finds out how it goes -->
            <template v-if="connectionStore.getConnection(end.connectionId)">
                <div v-if="end.connectionKind === 'unknown'" class="method-setting">
                    <span>How</span>
                    <div class="unknown-pickers">
                        <Select
                            v-for="picker in getUnknownPickers(end)"
                            :key="picker.placeholder"
                            :model-value="undefined"
                            :options="picker.options"
                            option-label="label"
                            option-disabled="disabled"
                            :placeholder="picker.placeholder.replace('+ ', '')"
                            :filter="!!picker.filterPlaceholder"
                            :filter-placeholder="picker.filterPlaceholder"
                            :empty-message="picker.emptyMessage"
                            size="small"
                            class="detail-prime-select"
                            @change="event => decideUnknown(connectionStore.getConnection(end.connectionId)!, event.value)"
                        />
                    </div>
                </div>
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

.method-setting .detail-input {
    flex: 1;
    min-width: 0;
}

/* Nobody knows yet how it gets there: an api or another way, side by side */
.unknown-pickers {
    display: flex;
    flex: 1;
    gap: 4px;
    min-width: 0;
}

.unknown-pickers :deep(.detail-prime-select.p-select) {
    flex: 1;
    min-width: 0;
    border-color: #fcd34d;
    background: #fffbeb;
}
</style>
