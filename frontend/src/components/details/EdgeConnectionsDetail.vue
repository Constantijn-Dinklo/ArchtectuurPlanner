<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { vCollapsible } from '../../directives/collapsible';
    import { useApiStore } from '../../stores/api.store';
    import { useConnectionStore } from '../../stores/connection.store';
    import { useInformationRelationStore } from '../../stores/information/informationRelation.store';
    import { useInformationFieldStore } from '../../stores/information/informationField.store';
    import { useInformationObjectStore } from '../../stores/information/informationObject.store';
    import { useResourceService } from '../../services/resources/resource.service';
    import { useComponentStore } from '../../stores/resources/component.store';
    import { getEndsInformation, type ComponentEnd } from '../../types/component.types';
    import { CONNECTION_KINDS, getConnectionKindInfo, type Connection, type ConnectionKind } from '../../types/connection.types';
    import CarriedInformationEditor from './CarriedInformationEditor.vue';

    // The connections of one edge. All of them go from the same source to the same target, so every connection is a
    // card that can be opened: how the information gets there (its kind), and what goes through it
    const props = defineProps<{
        sourceId: string;
        targetId: string;
        connectionIds: string[];
        scriptIds?: string[];
    }>();

    // A card: a connection, or a script that reads from the source or writes to the target
    interface EdgeCard {
        key: string;
        icon: string;
        label: string;
        detail?: string;
        connection?: Connection;
        scriptId?: string;
    }

    const apiStore = useApiStore();
    const connectionStore = useConnectionStore();
    const informationRelationStore = useInformationRelationStore();
    const informationFieldStore = useInformationFieldStore();
    const informationObjectStore = useInformationObjectStore();
    const resourceService = useResourceService();
    const componentStore = useComponentStore();

    const cards = computed<EdgeCard[]>(() => [
        ...props.connectionIds.flatMap((id): EdgeCard[] => {
            const connection = connectionStore.getConnection(id);
            if (!connection) return [];
            const kind = getConnectionKindInfo(connection.kind);
            const detail = connection.kind === 'api' ? apiStore.getApi(connection.apiId)?.url : connection.description;
            return [{ key: `connection:${id}`, icon: kind.icon, label: kind.label, detail: detail || undefined, connection }];
        }),
        ...(props.scriptIds ?? []).map(id => {
            const script = componentStore.getComponent(id);
            const host = script ? resourceService.getResource(script.resourceId)?.name : undefined;
            return { key: `script:${id}`, icon: 'pi pi-code', label: 'Script', detail: `${script?.name ?? '?'}${host ? ` (on ${host})` : ''}`, scriptId: id };
        })
    ]);

    // <-- What goes through a connection: the relations that name it -->
    function getPassedAlong(connectionId: string) {
        const objectNames = informationRelationStore.objectRelations
            .filter(relation => relation.connectionId === connectionId)
            .map(relation => informationObjectStore.getInformationObject(relation.informationObjectId)?.objectName ?? 'Unknown object');
        const fieldNames = informationRelationStore.fieldRelations
            .filter(relation => relation.connectionId === connectionId)
            .map(relation => informationFieldStore.getInformationField(relation.informationFieldId)?.fieldName ?? 'Unknown field');
        return { objectNames: [...new Set(objectNames)], fieldNames: [...new Set(fieldNames)] };
    }

    // <-- How it gets there: the kind. An api connection goes through one api of its source -->
    function getSourceApis(connection: Connection) {
        return apiStore.getApplicationApis(connection.source.id);
    }

    // The kind chosen in the card, before an api is picked for it
    const pendingApiKind = ref<Set<string>>(new Set());

    function chooseKind(connection: Connection, kind: ConnectionKind) {
        if (kind === 'api') {
            pendingApiKind.value = new Set([...pendingApiKind.value, connection.id]);
            return;
        }
        pendingApiKind.value.delete(connection.id);
        connectionStore.updateConnection(connection.id, { kind });
    }

    function chooseApi(connection: Connection, apiId: string) {
        if (!apiId) return;
        pendingApiKind.value.delete(connection.id);
        connectionStore.updateConnection(connection.id, { kind: 'api', apiId });
    }

    function shownKind(connection: Connection) {
        return pendingApiKind.value.has(connection.id) ? 'api' : connection.kind;
    }

    function updateDescription(connection: Connection, description: string) {
        if (description !== connection.description) connectionStore.updateConnection(connection.id, { description });
    }

    // Removing a connection asks for a second click: everything that goes through it is removed as well
    const confirmingRemove = ref<string>();

    function onRemoveClick(connection: Connection) {
        if (confirmingRemove.value !== connection.id) {
            confirmingRemove.value = connection.id;
            return;
        }
        confirmingRemove.value = undefined;
        connectionStore.deleteConnection(connection.id);
    }

    // <-- Scripts carry what they read from the source of the edge and write to its target.
    // When the edge only goes to or from the script, what it reads from the source or writes to the target -->

    // A table is reached through its database
    function isOnSide(resourceId: string, sideId: string) {
        if (resourceId === sideId) return true;
        const resource = resourceService.getResource(resourceId);
        return resource?.type === 'table' && resource.databaseId === sideId;
    }

    function getScriptCarried(scriptId: string) {
        const script = componentStore.getComponent(scriptId);
        if (!script) return { informationFieldIds: [], informationObjectIds: [] };
        const isEnd = (end: ComponentEnd, sideId: string) => end.componentId === sideId || isOnSide(end.resourceId, sideId);

        const readsSource = script.inputs.some(end => isEnd(end, props.sourceId));
        const writesTarget = script.outputs.some(end => isEnd(end, props.targetId));
        const read = getEndsInformation(script.inputs, end => isEnd(end, props.sourceId));
        const written = getEndsInformation(script.outputs, end => isEnd(end, props.targetId));
        if (readsSource && writesTarget) {
            return {
                informationFieldIds: read.informationFieldIds.filter(id => written.informationFieldIds.includes(id)),
                informationObjectIds: read.informationObjectIds.filter(id => written.informationObjectIds.includes(id))
            };
        }
        return readsSource ? read : written;
    }

    // Whether any information is known to go through it
    function hasInformation(card: EdgeCard) {
        if (card.scriptId) {
            const carried = getScriptCarried(card.scriptId);
            return (carried.informationFieldIds.length + carried.informationObjectIds.length) > 0;
        }
        const passedAlong = getPassedAlong(card.connection!.id);
        return passedAlong.objectNames.length + passedAlong.fieldNames.length > 0;
    }

    // Every card starts collapsed
    const expandedCards = ref<Set<string>>(new Set());

    function toggleCard(card: EdgeCard) {
        const expanded = new Set(expandedCards.value);
        if (expanded.has(card.key)) {
            expanded.delete(card.key);
        } else {
            expanded.add(card.key);
        }
        expandedCards.value = expanded;
    }
</script>

<template>
    <section v-collapsible class="detail-section">
        <div class="detail-section-title">
            <span>Connections</span>
            <span class="detail-count">{{ cards.length }}</span>
        </div>

        <div
            v-if="!cards.length"
            class="detail-empty"
        >
            No connections
        </div>

        <div
            v-for="card in cards"
            :key="card.key"
            class="edge-connection"
        >
            <button
                type="button"
                class="edge-connection-header"
                :class="{ unknown: card.connection?.kind === 'unknown' }"
                @click="toggleCard(card)"
            >
                <i
                    class="pi pi-chevron-right expand-icon"
                    :class="{ expanded: expandedCards.has(card.key) }"
                />
                <i :class="card.icon" class="connection-icon" />
                <span class="connection-label">{{ card.label }}</span>
                <span
                    v-if="card.detail"
                    class="connection-detail"
                    :title="card.detail"
                >
                    {{ card.detail }}
                </span>

                <span
                    v-if="!hasInformation(card)"
                    class="no-information-warning"
                    title="No known information goes through this connection"
                >
                    <i class="pi pi-exclamation-triangle" />
                </span>
            </button>

            <div
                v-if="expandedCards.has(card.key)"
                class="edge-connection-body"
            >
                <template v-if="card.connection">
                    <!-- How the information gets there -->
                    <label class="connection-setting">
                        <span>How</span>
                        <select
                            class="detail-select"
                            :value="shownKind(card.connection)"
                            @change="chooseKind(card.connection, ($event.target as HTMLSelectElement).value as ConnectionKind)"
                        >
                            <option v-for="option in CONNECTION_KINDS" :key="option.kind" :value="option.kind">
                                {{ option.label }}
                            </option>
                        </select>
                    </label>

                    <label v-if="shownKind(card.connection) === 'api'" class="connection-setting">
                        <span>API</span>
                        <select
                            class="detail-select"
                            :class="{ 'needs-choice': card.connection.kind !== 'api' }"
                            :value="card.connection.kind === 'api' ? card.connection.apiId : ''"
                            @change="chooseApi(card.connection, ($event.target as HTMLSelectElement).value)"
                        >
                            <option value="" disabled>
                                {{ getSourceApis(card.connection).length ? 'Choose the API' : 'The source has no APIs' }}
                            </option>
                            <option v-for="api in getSourceApis(card.connection)" :key="api.id" :value="api.id">
                                {{ api.url }}
                            </option>
                        </select>
                    </label>

                    <label class="connection-setting">
                        <span>Description</span>
                        <input
                            :value="card.connection.description"
                            type="text"
                            class="detail-input"
                            placeholder="e.g. weekly export"
                            @change="updateDescription(card.connection, ($event.target as HTMLInputElement).value)"
                        />
                    </label>

                    <!-- What goes through it: the relations that name this connection -->
                    <div class="passed-along">
                        <span
                            v-for="objectName in getPassedAlong(card.connection.id).objectNames"
                            :key="`object:${objectName}`"
                            class="passed-chip object"
                        >
                            ▱ {{ objectName }}
                        </span>
                        <span
                            v-for="fieldName in getPassedAlong(card.connection.id).fieldNames"
                            :key="`field:${fieldName}`"
                            class="passed-chip"
                        >
                            {{ fieldName }}
                        </span>
                        <span v-if="!hasInformation(card)" class="detail-empty">Nothing goes through it yet</span>
                    </div>
                    <div class="passed-along-hint">
                        What the receiving resource takes in through this connection. Change it under Receives from or Sends to of the application.
                    </div>

                    <!-- What an api sends belongs to the api, so it is the same for every connection through it -->
                    <template v-if="card.connection.kind === 'api' && apiStore.getApi(card.connection.apiId)">
                        <div class="passed-along-hint">What the API sends</div>
                        <CarriedInformationEditor
                            :source-id="apiStore.getApi(card.connection.apiId)!.applicationId"
                            :information-field-ids="apiStore.getApi(card.connection.apiId)!.informationFieldIds ?? []"
                            :information-object-ids="apiStore.getApi(card.connection.apiId)!.informationObjectIds ?? []"
                            @add-field="id => apiStore.addInformationField((card.connection as any).apiId, id)"
                            @remove-field="id => apiStore.removeInformationField((card.connection as any).apiId, id)"
                            @add-object="id => apiStore.addInformationObject((card.connection as any).apiId, id)"
                            @remove-object="id => apiStore.removeInformationObject((card.connection as any).apiId, id)"
                        />
                    </template>

                    <button
                        type="button"
                        class="remove-connection-button"
                        :class="{ confirming: confirmingRemove === card.connection.id }"
                        @click="onRemoveClick(card.connection)"
                    >
                        <i class="pi pi-trash" />
                        {{ confirmingRemove === card.connection.id ? 'Click again: also removes what goes through it' : 'Remove connection' }}
                    </button>
                </template>

                <!-- Scripts carry what they read from and write to the resources of the edge; it is edited in the script's details -->
                <template v-else-if="card.scriptId">
                    <div class="passed-along">
                        <span
                            v-for="objectId in getScriptCarried(card.scriptId).informationObjectIds"
                            :key="`object:${objectId}`"
                            class="passed-chip object"
                        >
                            ▱ {{ informationObjectStore.getInformationObject(objectId)?.objectName ?? 'Unknown object' }}
                        </span>
                        <span
                            v-for="fieldId in getScriptCarried(card.scriptId).informationFieldIds"
                            :key="`field:${fieldId}`"
                            class="passed-chip"
                        >
                            {{ informationFieldStore.getInformationField(fieldId)?.fieldName ?? 'Unknown field' }}
                        </span>
                        <span v-if="!hasInformation(card)" class="detail-empty">Nothing carried yet</span>
                    </div>
                    <div class="passed-along-hint">
                        This is what the script reads from and writes to here. Open the script (from the database level on) and expand what it reads from or writes to, to change it.
                    </div>
                </template>
            </div>
        </div>
    </section>
</template>

<style scoped>
.edge-connection {
    margin-bottom: 6px;

    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #ffffff;
}

.edge-connection-header {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    min-height: 30px;
    padding: 0 8px;

    border: 0;
    border-radius: 8px;
    background: transparent;

    color: #1e293b;
    font: inherit;
    font-size: 12px;
    text-align: left;
    cursor: pointer;
}

.edge-connection-header:hover {
    background: #f8fafc;
}

/* Nobody knows yet how it gets there */
.edge-connection-header.unknown {
    color: #92400e;
}

.edge-connection-header.unknown .connection-icon {
    color: #d97706;
}

.expand-icon {
    flex: 0 0 auto;
    color: #94a3b8;
    font-size: 9px;

    transition: transform 0.15s ease;
}

.expand-icon.expanded {
    transform: rotate(90deg);
}

.connection-icon {
    flex: 0 0 auto;
    color: #64748b;
    font-size: 11px;
}

.connection-label {
    flex: 0 0 auto;
    font-weight: 600;
}

.connection-detail {
    flex: 1;
    min-width: 0;
    overflow: hidden;

    color: #64748b;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.no-information-warning {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    margin-left: auto;

    width: 20px;
    height: 20px;
    border-radius: 50%;

    background: #fef3c7;
    color: #d97706;
    font-size: 10px;
    cursor: help;
}

.edge-connection-body {
    padding: 2px 8px 8px;
    border-top: 1px solid #f1f5f9;
}

/* The editor indents itself for use under a row; inside a card that is not needed */
.edge-connection-body :deep(.carried-information) {
    padding: 6px 0 0;
}

.connection-setting {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;

    color: #64748b;
    font-size: 11px;
}

.connection-setting > span {
    flex: 0 0 70px;
}

.connection-setting .detail-select,
.connection-setting .detail-input {
    flex: 1;
    min-width: 0;
}

.connection-setting .needs-choice {
    border-color: #fcd34d;
    background: #fffbeb;
    color: #b45309;
}

.passed-along {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding-top: 6px;
}

.passed-chip {
    padding: 1px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 999px;

    background: #ffffff;
    font-size: 11px;
}

.passed-chip.object {
    border-color: #c7d2fe;
    background: #eef2ff;
    color: #3730a3;
}

.passed-along-hint {
    margin-top: 6px;

    color: #94a3b8;
    font-size: 10px;
    line-height: 1.4;
}

.remove-connection-button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 8px;
    padding: 3px 8px;

    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #ffffff;

    color: #64748b;
    font: inherit;
    font-size: 11px;
    cursor: pointer;
}

.remove-connection-button:hover,
.remove-connection-button.confirming {
    border-color: #fca5a5;
    background: #fef2f2;
    color: #b91c1c;
}
</style>
