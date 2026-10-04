<script setup lang="ts">
    import { computed } from 'vue';
    import type { Api } from '../stores/api.store';
    import type { Resource } from '../services/resources/resource.service';
    import type { Script } from '../stores/script.store';

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
        humanConnections?: {
            id: string;
            description: string;
            source?: Resource;
            target?: Resource;
        }[]
    }

    const props = defineProps<{
       connectionsInfo: ConnectionsInfo
    }>();

    const connectionCount = computed(() =>
        (props.connectionsInfo.apiConnections?.length ?? 0) +
        (props.connectionsInfo.scripts?.length ?? 0) +
        (props.connectionsInfo.databaseConnections?.length ?? 0) +
        (props.connectionsInfo.humanConnections?.length ?? 0)
    );
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
                class="detail-row"
            >
                <i class="pi pi-globe detail-row-icon" />
                <span class="detail-row-name" :title="apiConnection.api?.url">
                    {{ apiConnection.api?.url || 'No url selected' }}
                </span>
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

        <template v-if="connectionsInfo.humanConnections && connectionsInfo.humanConnections.length > 0">
            <div class="detail-subtitle">Human</div>
            <div
                v-for="humanConnection in connectionsInfo.humanConnections"
                :key="humanConnection.id"
                class="detail-row"
                :title="humanConnection.description || undefined"
            >
                <i class="pi pi-user detail-row-icon" />
                <span class="detail-row-name">
                    {{ humanConnection.source?.name ?? '?' }} → {{ humanConnection.target?.name ?? '?' }}
                </span>
            </div>
        </template>
    </section>
</template>
