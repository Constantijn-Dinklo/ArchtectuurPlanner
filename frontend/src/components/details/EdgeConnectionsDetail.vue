<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { vCollapsible } from '../../directives/collapsible';
    import { useApiStore } from '../../stores/api.store';
    import { useApiConnectionStore } from '../../stores/apiConnection.store';
    import { useScriptStore } from '../../stores/script.store';
    import { useDatabaseConnectionStore } from '../../stores/databaseConnection.store';
    import { getOtherConnectionMethodInfo, useOtherConnectionStore } from '../../stores/otherConnection.store';
    import {
        useInformationRelationStore,
        type ConnectionType,
        type ResourceRelation
    } from '../../stores/information/informationRelation.store';
    import { useInformationFieldStore } from '../../stores/information/informationField.store';
    import { useInformationObjectStore } from '../../stores/information/informationObject.store';
    import { useApiConnectionService } from '../../services/apiConnection.service';
    import { useInformationSourceService } from '../../services/informationSource.service';
    import { useResourceService } from '../../services/resources/resource.service';
    import CarriedInformationEditor from './CarriedInformationEditor.vue';

    // The connections of one edge. All of them go from the same source to the same target,
    // so every connection is a card that can be opened to see and edit the information it passes along
    const props = defineProps<{
        sourceId: string;
        targetId: string;
        apiConnectionIds: string[];
        scriptIds: string[];
        databaseConnectionIds: string[];
        otherConnectionIds: string[];
    }>();

    interface EdgeConnection {
        type: ConnectionType;
        id: string;
        icon: string;
        label: string;
        detail?: string;
    }

    const apiStore = useApiStore();
    const apiConnectionStore = useApiConnectionStore();
    const scriptStore = useScriptStore();
    const databaseConnectionStore = useDatabaseConnectionStore();
    const otherConnectionStore = useOtherConnectionStore();
    const informationRelationStore = useInformationRelationStore();
    const informationFieldStore = useInformationFieldStore();
    const informationObjectStore = useInformationObjectStore();
    const apiConnectionService = useApiConnectionService();
    const informationSourceService = useInformationSourceService();
    const resourceService = useResourceService();

    const connections = computed<EdgeConnection[]>(() => [
        ...props.apiConnectionIds.map(id => {
            const url = getUrl(id);
            return { type: 'api' as const, id, icon: 'pi pi-globe', label: 'API', detail: url?.url ?? 'No url selected' };
        }),
        ...props.otherConnectionIds.map(id => {
            const connection = otherConnectionStore.otherConnections.find(other => other.id === id);
            const method = getOtherConnectionMethodInfo(connection?.method ?? 'unknown');
            return { type: 'other' as const, id, icon: method.icon, label: method.label, detail: connection?.description || undefined };
        }),
        ...props.scriptIds.map(id => ({
            type: 'script' as const,
            id,
            icon: 'pi pi-code',
            label: 'Script',
            detail: scriptStore.scripts.find(script => script.id === id)?.name
        })),
        ...props.databaseConnectionIds.map(id => {
            const connection = databaseConnectionStore.databaseConnections.find(database => database.id === id);
            // The edge goes from the database to the resource for reading, the other way around for writing
            const reads = connection?.databaseId === props.sourceId;
            return { type: 'database' as const, id, icon: 'pi pi-database', label: reads ? 'Database read' : 'Database write' };
        })
    ]);

    // <-- Api connections: what is passed along is decided by the url -->
    function getUrl(apiConnectionId: string) {
        const connection = apiConnectionStore.apiConnections.find(apiConnection => apiConnection.id === apiConnectionId);
        return connection ? apiStore.getApi(connection.sourceUrlId) : undefined;
    }

    function getApiConnection(apiConnectionId: string) {
        return apiConnectionStore.apiConnections.find(apiConnection => apiConnection.id === apiConnectionId);
    }

    function selectUrl(apiConnectionId: string, sourceUrlId: string) {
        if (!sourceUrlId) return;
        apiConnectionService.updateApiConnection(apiConnectionId, { sourceUrlId });
    }

    function getOtherConnection(id: string) {
        return otherConnectionStore.otherConnections.find(connection => connection.id === id);
    }

    // <-- Scripts and database connections do not list what they pass along themselves.
    // It follows from the relations between the two resources that come through the connection -->

    // A table is reached through its database
    function isOnSide(resourceId: string, sideId: string) {
        if (resourceId === sideId) return true;
        const resource = resourceService.getResource(resourceId);
        return resource?.type === 'table' && resource.databaseId === sideId;
    }

    function comesThrough(relation: ResourceRelation, information: Parameters<typeof informationSourceService.resolveVia>[1], connection: EdgeConnection) {
        if (!isOnSide(relation.sourceResourceId, props.sourceId) || !isOnSide(relation.targetResourceId, props.targetId)) return false;
        const via = informationSourceService.resolveVia(relation, information);
        return via.selected?.type === connection.type && via.selected?.id === connection.id;
    }

    function getPassedAlong(connection: EdgeConnection) {
        const objectNames = informationRelationStore.objectRelations
            .filter(relation => comesThrough(relation, { informationObjectId: relation.informationObjectId }, connection))
            .map(relation => informationObjectStore.getInformationObject(relation.informationObjectId)?.objectName ?? 'Unknown object');
        const fieldNames = informationRelationStore.fieldRelations
            .filter(relation => comesThrough(relation, { informationFieldId: relation.informationFieldId }, connection))
            .map(relation => informationFieldStore.getInformationField(relation.informationFieldId)?.fieldName ?? 'Unknown field');
        return { objectNames: [...new Set(objectNames)], fieldNames: [...new Set(fieldNames)] };
    }

    // Whether any information is known to be passed along through the connection
    function hasInformation(connection: EdgeConnection) {
        if (connection.type === 'api') {
            const url = getUrl(connection.id);
            return !!url && ((url.informationFieldIds?.length ?? 0) + (url.informationObjectIds?.length ?? 0)) > 0;
        }
        if (connection.type === 'other') {
            const other = getOtherConnection(connection.id);
            return !!other && (other.informationFieldIds.length + other.informationObjectIds.length) > 0;
        }
        const passedAlong = getPassedAlong(connection);
        return passedAlong.objectNames.length + passedAlong.fieldNames.length > 0;
    }

    // Every connection card starts collapsed
    const expandedConnections = ref<Set<string>>(new Set());

    function connectionKey(connection: EdgeConnection) {
        return `${connection.type}:${connection.id}`;
    }

    function toggleConnection(connection: EdgeConnection) {
        const expanded = new Set(expandedConnections.value);
        const key = connectionKey(connection);
        if (expanded.has(key)) {
            expanded.delete(key);
        } else {
            expanded.add(key);
        }
        expandedConnections.value = expanded;
    }
</script>

<template>
    <section v-collapsible class="detail-section">
        <div class="detail-section-title">
            <span>Connections</span>
            <span class="detail-count">{{ connections.length }}</span>
        </div>

        <div
            v-if="!connections.length"
            class="detail-empty"
        >
            No connections
        </div>

        <div
            v-for="connection in connections"
            :key="connectionKey(connection)"
            class="edge-connection"
        >
            <button
                type="button"
                class="edge-connection-header"
                @click="toggleConnection(connection)"
            >
                <i
                    class="pi pi-chevron-right expand-icon"
                    :class="{ expanded: expandedConnections.has(connectionKey(connection)) }"
                />
                <i :class="connection.icon" class="connection-icon" />
                <span class="connection-label">{{ connection.label }}</span>
                <span
                    v-if="connection.detail"
                    class="connection-detail"
                    :title="connection.detail"
                >
                    {{ connection.detail }}
                </span>

                <span
                    v-if="!hasInformation(connection)"
                    class="no-information-warning"
                    title="No known information being sent through this connection"
                >
                    <i class="pi pi-exclamation-triangle" />
                </span>
            </button>

            <div
                v-if="expandedConnections.has(connectionKey(connection))"
                class="edge-connection-body"
            >
                <!-- Api: without a url nothing can be sent, so the url can be chosen here -->
                <template v-if="connection.type === 'api'">
                    <select
                        v-if="!getUrl(connection.id)"
                        class="detail-select url-select"
                        value=""
                        @change="selectUrl(connection.id, ($event.target as HTMLSelectElement).value)"
                    >
                        <option value="" disabled>
                            {{ apiStore.getApplicationApis(getApiConnection(connection.id)?.sourceId ?? '').length ? 'Select url' : 'The source has no API urls' }}
                        </option>
                        <option
                            v-for="url in apiStore.getApplicationApis(getApiConnection(connection.id)?.sourceId ?? '')"
                            :key="url.id"
                            :value="url.id"
                        >
                            {{ url.url }}
                        </option>
                    </select>

                    <!-- What is sent belongs to the url, so it is the same for every connection that uses the url -->
                    <CarriedInformationEditor
                        v-else
                        :source-id="getUrl(connection.id)!.applicationId"
                        :information-field-ids="getUrl(connection.id)!.informationFieldIds ?? []"
                        :information-object-ids="getUrl(connection.id)!.informationObjectIds ?? []"
                        @add-field="id => apiStore.addInformationField(getUrl(connection.id)!.id, id)"
                        @remove-field="id => apiStore.removeInformationField(getUrl(connection.id)!.id, id)"
                        @add-object="id => apiStore.addInformationObject(getUrl(connection.id)!.id, id)"
                        @remove-object="id => apiStore.removeInformationObject(getUrl(connection.id)!.id, id)"
                    />
                </template>

                <template v-else-if="connection.type === 'other'">
                    <CarriedInformationEditor
                        v-if="getOtherConnection(connection.id)?.sourceId"
                        :source-id="getOtherConnection(connection.id)!.sourceId!"
                        :information-field-ids="getOtherConnection(connection.id)!.informationFieldIds"
                        :information-object-ids="getOtherConnection(connection.id)!.informationObjectIds"
                        @add-field="id => otherConnectionStore.addInformationField(connection.id, id)"
                        @remove-field="id => otherConnectionStore.removeInformationField(connection.id, id)"
                        @add-object="id => otherConnectionStore.addInformationObject(connection.id, id)"
                        @remove-object="id => otherConnectionStore.removeInformationObject(connection.id, id)"
                    />
                </template>

                <!-- Scripts and database connections: what the receiving resource takes in through this connection -->
                <template v-else>
                    <div class="passed-along">
                        <span
                            v-for="objectName in getPassedAlong(connection).objectNames"
                            :key="`object:${objectName}`"
                            class="passed-chip object"
                        >
                            ▱ {{ objectName }}
                        </span>
                        <span
                            v-for="fieldName in getPassedAlong(connection).fieldNames"
                            :key="`field:${fieldName}`"
                            class="passed-chip"
                        >
                            {{ fieldName }}
                        </span>
                        <span
                            v-if="!hasInformation(connection)"
                            class="detail-empty"
                        >
                            Nothing known yet
                        </span>
                    </div>
                    <div class="passed-along-hint">
                        A {{ connection.type === 'script' ? 'script' : 'database connection' }} does not list what it passes along.
                        This is the information the receiving resource takes in through it.
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

.url-select {
    width: 100%;
    margin-top: 6px;
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
</style>
