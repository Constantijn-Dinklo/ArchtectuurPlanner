<script setup lang="ts">
    import { vCollapsible } from '../directives/collapsible';
    import { useResourceService } from '../services/resources/resource.service';
    import { useInformationSourceService } from '../services/informationSource.service';
    import { getConnectionKindInfo, type Connection } from '../types/connection.types';

    // The connections of a resource, in either direction. What goes through a connection, and how it works,
    // is shown and changed by selecting its edge on the canvas
    defineProps<{
        connections: Connection[];
    }>();

    const resourceService = useResourceService();
    const informationSourceService = useInformationSourceService();

    function getName(partId: string) {
        return resourceService.getResource(partId)?.name ?? '?';
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
            :key="connection.id"
            class="detail-row"
            :class="{ unknown: connection.kind === 'unknown' }"
            :title="informationSourceService.describeConnection(connection)"
        >
            <i :class="getConnectionKindInfo(connection.kind).icon" class="detail-row-icon" />
            <span class="detail-row-name connection-name">
                <span class="connection-route">
                    {{ getName(connection.source.id) }} → {{ getName(connection.target.id) }}
                </span>
                <span class="connection-kind">
                    {{ informationSourceService.describeConnection(connection) }}
                </span>
            </span>
        </div>
    </section>
</template>

<style scoped>
.connection-name {
    display: flex;
    flex-direction: column;
}

.connection-route {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.connection-kind {
    overflow: hidden;

    color: #94a3b8;
    font-size: 10px;
    white-space: nowrap;
    text-overflow: ellipsis;
}

/* Nobody knows yet how it gets there */
.detail-row.unknown .detail-row-icon,
.detail-row.unknown .connection-kind {
    color: #d97706;
}
</style>
