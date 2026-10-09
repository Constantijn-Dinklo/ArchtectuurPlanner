<script setup lang="ts">
    import { computed } from 'vue';
    import { useApiStore, type Api } from '../stores/api.store';
    import type { Resource } from '../services/resources/resource.service';
    import type { Script } from '../stores/script.store';
    import {
        getOtherConnectionMethodInfo,
        useOtherConnectionStore,
        type OtherConnectionMethod
    } from '../stores/otherConnection.store';
    import { useApiConnectionService } from '../services/apiConnection.service';
    import CarriedInformationEditor from './details/CarriedInformationEditor.vue';

    interface ConnectionsInfo {
        apiConnections: {
            id: string;
            sourceId: string;
            sourceUrlId: string;
            targetId: string;
            source?: Resource;
            target?: Resource;
            api?: Api;
        }[],
        scripts: Script[],
        databaseConnections: {
            id: string;
            databaseId: string;
            entityId: string;
            database?: Resource;
            entity?: Resource
        }[],
        otherConnections?: {
            id: string;
            sourceId: string | null;
            method: OtherConnectionMethod;
            description: string;
            source?: Resource;
            target?: Resource;
        }[]
    }

    const props = defineProps<{
       connectionsInfo: ConnectionsInfo
    }>();

    const apiStore = useApiStore();
    const apiConnectionService = useApiConnectionService();
    const otherConnectionStore = useOtherConnectionStore();

    const connectionCount = computed(() =>
        (props.connectionsInfo.apiConnections?.length ?? 0) +
        (props.connectionsInfo.scripts?.length ?? 0) +
        (props.connectionsInfo.databaseConnections?.length ?? 0) +
        (props.connectionsInfo.otherConnections?.length ?? 0)
    );

    // The information of a url and an other connection is read from the stores, so edits show right away
    function getUrl(urlId: string) {
        return apiStore.getApi(urlId);
    }

    function getOtherConnection(id: string) {
        return otherConnectionStore.otherConnections.find(connection => connection.id === id);
    }

    function selectUrl(apiConnectionId: string, sourceUrlId: string) {
        if (!sourceUrlId) return;
        apiConnectionService.updateApiConnection(apiConnectionId, { sourceUrlId });
    }
</script>

<template>
    <section class="detail-section">
        <div class="detail-section-title">
            <span>Connections</span>
            <span class="detail-count">{{ connectionCount }}</span>
        </div>

        <div
            v-if="!connectionCount"
            class="detail-empty"
        >
            No connections
        </div>

        <template v-if="connectionsInfo.apiConnections && connectionsInfo.apiConnections.length > 0">
            <div class="detail-subtitle">API's</div>
            <div
                v-for="apiConnection in connectionsInfo.apiConnections"
                :key="apiConnection.id"
                class="connection-item"
            >
                <div class="detail-row">
                    <i class="pi pi-globe detail-row-icon" />

                    <span class="detail-row-name connection-name">
                        <span class="connection-route">
                            {{ apiConnection.source?.name ?? '?' }} → {{ apiConnection.target?.name ?? '?' }}
                        </span>
                        <span
                            v-if="getUrl(apiConnection.sourceUrlId)"
                            class="connection-url"
                            :title="getUrl(apiConnection.sourceUrlId)!.url"
                        >
                            {{ getUrl(apiConnection.sourceUrlId)!.url }}
                        </span>
                    </span>
                </div>

                <!-- Without a url no information can be transferred, so it can be chosen here -->
                <select
                    v-if="!getUrl(apiConnection.sourceUrlId)"
                    class="detail-select url-select"
                    value=""
                    @change="selectUrl(apiConnection.id, ($event.target as HTMLSelectElement).value)"
                >
                    <option value="" disabled>
                        {{ apiStore.getApplicationApis(apiConnection.sourceId).length ? 'Select url' : 'The source has no API urls' }}
                    </option>
                    <option
                        v-for="url in apiStore.getApplicationApis(apiConnection.sourceId)"
                        :key="url.id"
                        :value="url.id"
                    >
                        {{ url.url }}
                    </option>
                </select>

                <!-- What is sent belongs to the url, so it is the same for every connection that uses the url -->
                <CarriedInformationEditor
                    v-else
                    :source-id="getUrl(apiConnection.sourceUrlId)!.applicationId"
                    :information-field-ids="getUrl(apiConnection.sourceUrlId)!.informationFieldIds ?? []"
                    :information-object-ids="getUrl(apiConnection.sourceUrlId)!.informationObjectIds ?? []"
                    @add-field="id => apiStore.addInformationField(apiConnection.sourceUrlId, id)"
                    @remove-field="id => apiStore.removeInformationField(apiConnection.sourceUrlId, id)"
                    @add-object="id => apiStore.addInformationObject(apiConnection.sourceUrlId, id)"
                    @remove-object="id => apiStore.removeInformationObject(apiConnection.sourceUrlId, id)"
                />
            </div>
        </template>

        <template v-if="connectionsInfo.scripts && connectionsInfo.scripts.length > 0">
            <div class="detail-subtitle">Scripts</div>
            <div
                v-for="script in connectionsInfo.scripts"
                :key="script.id"
                class="detail-row"
            >
                <i class="pi pi-code detail-row-icon" />
                <span class="detail-row-name">{{ script.name }}</span>
            </div>
        </template>

        <template v-if="connectionsInfo.databaseConnections && connectionsInfo.databaseConnections.length > 0">
            <div class="detail-subtitle">Database's</div>
            <div
                v-for="database in connectionsInfo.databaseConnections"
                :key="database.id"
                class="detail-row"
            >
                <i class="pi pi-database detail-row-icon" />
                <span class="detail-row-name">{{ database.database?.name || 'No database selected' }}</span>
            </div>
        </template>

        <template v-if="connectionsInfo.otherConnections && connectionsInfo.otherConnections.length > 0">
            <div class="detail-subtitle">Other</div>
            <div
                v-for="otherConnection in connectionsInfo.otherConnections"
                :key="otherConnection.id"
                class="connection-item"
            >
                <div
                    class="detail-row"
                    :title="`${getOtherConnectionMethodInfo(otherConnection.method).label}${otherConnection.description ? `: ${otherConnection.description}` : ''}`"
                >
                    <i :class="getOtherConnectionMethodInfo(otherConnection.method).icon" class="detail-row-icon" />
                    <span class="detail-row-name connection-name">
                        <span class="connection-route">
                            {{ otherConnection.source?.name ?? '?' }} → {{ otherConnection.target?.name ?? '?' }}
                        </span>
                        <span class="connection-url">
                            {{ getOtherConnectionMethodInfo(otherConnection.method).label }}{{ otherConnection.description ? ` · ${otherConnection.description}` : '' }}
                        </span>
                    </span>
                </div>

                <CarriedInformationEditor
                    v-if="otherConnection.sourceId && getOtherConnection(otherConnection.id)"
                    :source-id="otherConnection.sourceId"
                    :information-field-ids="getOtherConnection(otherConnection.id)!.informationFieldIds"
                    :information-object-ids="getOtherConnection(otherConnection.id)!.informationObjectIds"
                    @add-field="id => otherConnectionStore.addInformationField(otherConnection.id, id)"
                    @remove-field="id => otherConnectionStore.removeInformationField(otherConnection.id, id)"
                    @add-object="id => otherConnectionStore.addInformationObject(otherConnection.id, id)"
                    @remove-object="id => otherConnectionStore.removeInformationObject(otherConnection.id, id)"
                />
                <div v-else class="detail-empty no-source">
                    Select the source of this connection in the Other tab first
                </div>
            </div>
        </template>
    </section>
</template>

<style scoped>
.connection-item {
    margin-bottom: 4px;
}

.connection-item + .connection-item {
    padding-top: 4px;
    border-top: 1px dashed #eef2f7;
}

.connection-name {
    display: flex;
    flex-direction: column;
}

.connection-route {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.connection-url {
    overflow: hidden;

    color: #94a3b8;
    font-size: 10px;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.url-select {
    width: calc(100% - 22px);
    margin: 2px 0 4px 22px;
    border-color: #fcd34d;
    background: #fffbeb;
    color: #b45309;
}

.no-source {
    padding-left: 22px;
}
</style>
