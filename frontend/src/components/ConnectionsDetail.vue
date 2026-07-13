<script setup lang="ts">
    import type { Api } from '../stores/api.store';
    import type { Resource } from '../services/resource.service';
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
        }[]
    }

    const props = defineProps<{
       connectionsInfo: ConnectionsInfo
    }>();

</script>

<template>

    <div v-if="connectionsInfo.apiConnections && connectionsInfo.apiConnections.length > 0">
        API's
        <ul>
            <li v-for="apiConnection in connectionsInfo.apiConnections">
                {{ apiConnection.api?.url }}
            </li>
        </ul>
    </div>

    <div v-if="connectionsInfo.scripts && connectionsInfo.scripts.length > 0">
        Scripts
        <ul>
            <li v-for="script in connectionsInfo.scripts">
                {{ script.name }}
            </li>
        </ul>
    </div>

    <div v-if="connectionsInfo.databaseConnections && connectionsInfo.databaseConnections.length > 0">
        Database's
        <ul>
            <li v-for="database in connectionsInfo.databaseConnections">
                {{ database.database?.name }}
            </li>
        </ul>
    </div>
</template>