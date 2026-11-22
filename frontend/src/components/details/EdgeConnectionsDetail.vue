<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { vCollapsible } from '../../directives/collapsible';
    import { useApiStore } from '../../stores/api.store';
    import { useConnectionStore } from '../../stores/connection.store';
    import { useInformationRelationStore } from '../../stores/information/informationRelation.store';
    import { useCanvasEndService, type ConnectionPiece } from '../../services/canvasEnd.service';
    import { usePartService } from '../../services/part.service';
    import { useInformationFieldStore } from '../../stores/information/informationField.store';
    import { useInformationObjectStore } from '../../stores/information/informationObject.store';
    import { CONNECTION_KINDS, getConnectionKindInfo, type Connection, type ConnectionKind } from '../../types/connection.types';
    import CarriedInformationEditor from './CarriedInformationEditor.vue';

    // The connections of one edge, as cards. A connection is shown per piece: writing to two files of a file location
    // is two cards, one per file, though it is one connection. A card can be opened: how the information gets there
    // (its kind), and what goes through it
    const props = defineProps<{
        sourceId: string;
        targetId: string;
        connectionIds: string[];
    }>();

    // A card: one piece of a connection
    interface EdgeCard {
        key: string;
        icon: string;
        label: string;
        detail?: string;
        connection: Connection;
        piece: ConnectionPiece;
    }

    const apiStore = useApiStore();
    const connectionStore = useConnectionStore();
    const informationRelationStore = useInformationRelationStore();
    const { getConnectionPieces } = useCanvasEndService();
    const partService = usePartService();
    const informationFieldStore = useInformationFieldStore();
    const informationObjectStore = useInformationObjectStore();

    // The name of the part of a piece, e.g. the file it writes to
    function getPartName(piece: ConnectionPiece) {
        return piece.partId ? partService.getPart(piece.partId)?.name ?? 'Unknown' : undefined;
    }

    const cards = computed<EdgeCard[]>(() => props.connectionIds.flatMap((id): EdgeCard[] => {
        const connection = connectionStore.getConnection(id);
        if (!connection) return [];
        const kind = getConnectionKindInfo(connection.kind);
        const way = connection.kind === 'api' ? apiStore.getApi(connection.apiId)?.url : connection.description;
        return getConnectionPieces(connection)
            .filter(piece => piece.sourceId === props.sourceId && piece.targetId === props.targetId)
            .sort((a, b) => (getPartName(a) ?? '').localeCompare(getPartName(b) ?? ''))
            .map(piece => ({
                key: `${id}:${piece.partId ?? ''}`,
                icon: kind.icon,
                label: kind.label,
                detail: [getPartName(piece), way].filter(Boolean).join(' · ') || undefined,
                connection,
                piece
            }));
    }));

    // <-- What goes through a piece: its relations -->
    type RelationRef = { kind: 'field' | 'object', id: string };

    // One piece of information, with its relations
    interface PassedAlong {
        key: string;
        kind: 'field' | 'object';
        label: string;
        relations: RelationRef[];
    }

    // Objects first
    function getPassedAlong(card: EdgeCard): PassedAlong[] {
        const items = new Map<string, PassedAlong>();
        const add = (kind: 'field' | 'object', informationId: string, label: string, relationId: string) => {
            const key = `${kind}:${informationId}`;
            const item = items.get(key) ?? { key, kind, label, relations: [] };
            item.relations.push({ kind, id: relationId });
            items.set(key, item);
        };
        for (const relation of card.piece.relations) {
            if ('informationObjectId' in relation) {
                add('object', relation.informationObjectId,
                    informationObjectStore.getInformationObject(relation.informationObjectId)?.objectName ?? 'Unknown object', relation.id);
            }
        }
        for (const relation of card.piece.relations) {
            if ('informationFieldId' in relation) {
                add('field', relation.informationFieldId,
                    informationFieldStore.getInformationField(relation.informationFieldId)?.fieldName ?? 'Unknown field', relation.id);
            }
        }
        return [...items.values()];
    }

    // Removing one piece of information: its relations. The connection stays
    function removePassedAlong(item: PassedAlong) {
        informationRelationStore.removeRelations(item.relations);
    }

    // The other pieces of the same connection, e.g. the other files of the file location it writes to: how it goes and
    // its description are shared with them
    function getSharedWith(card: EdgeCard) {
        return getConnectionPieces(card.connection)
            .filter(piece => piece.partId !== card.piece.partId)
            .map(piece => getPartName(piece))
            .filter((name): name is string => !!name);
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

    // Removing asks for a second click. A card of a part (e.g. a file) removes what goes to or from that part; the
    // connection goes as well when nothing else goes through it. Any other card removes the connection, with everything
    // that goes through it
    const confirmingRemove = ref<string>();

    async function onRemoveClick(card: EdgeCard) {
        if (confirmingRemove.value !== card.key) {
            confirmingRemove.value = card.key;
            return;
        }
        confirmingRemove.value = undefined;
        if (!card.piece.partId) {
            await connectionStore.deleteConnection(card.connection.id);
            return;
        }
        const isLast = getConnectionPieces(card.connection).length === 1;
        if (isLast) {
            await connectionStore.deleteConnection(card.connection.id);
            return;
        }
        await informationRelationStore.removeRelations(getPassedAlong(card).flatMap(item => item.relations));
    }

    // Whether any information is known to go through it
    function hasInformation(card: EdgeCard) {
        return card.piece.relations.length > 0;
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
                :class="{ unknown: card.connection.kind === 'unknown' }"
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

                    <!-- How it goes and the description belong to the connection, so they are the same for its other parts -->
                    <div v-if="getSharedWith(card).length" class="passed-along-hint">
                        How and the description are shared with: {{ getSharedWith(card).join(', ') }}
                    </div>

                    <!-- What goes through it: its relations -->
                    <div class="passed-along">
                        <span
                            v-for="item in getPassedAlong(card)"
                            :key="item.key"
                            class="passed-chip"
                            :class="item.kind"
                        >
                            {{ item.kind === 'object' ? `▱ ${item.label}` : item.label }}
                            <button
                                type="button"
                                class="passed-chip-remove"
                                title="Remove: this no longer goes through the connection"
                                @click="removePassedAlong(item)"
                            >
                                ×
                            </button>
                        </span>
                        <span v-if="!hasInformation(card)" class="detail-empty">Nothing goes through it yet</span>
                    </div>
                    <div class="passed-along-hint">
                        What the receiving part takes in through this connection. Remove it here, or change it under Receives from or Sends to of the application, or Reads from or Writes to of the script.
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
                        :class="{ confirming: confirmingRemove === card.key }"
                        @click="onRemoveClick(card)"
                    >
                        <i class="pi pi-trash" />
                        <template v-if="confirmingRemove === card.key">Click again: also removes what goes through it</template>
                        <template v-else>{{ card.piece.partId ? `Remove the connection to ${getPartName(card.piece)}` : 'Remove connection' }}</template>
                    </button>
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

.passed-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.passed-chip-remove {
    padding: 0;
    border: none;
    background: none;

    color: #94a3b8;
    font: inherit;
    line-height: 1;
    cursor: pointer;
}

.passed-chip-remove:hover {
    color: #b91c1c;
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
