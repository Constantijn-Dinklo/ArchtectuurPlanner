<script setup lang="ts">
    import { computed } from 'vue';
    import { vCollapsible } from '../directives/collapsible';
    import { usePartService } from '../services/part.service';
    import { useInformationSourceService } from '../services/informationSource.service';
    import { getConnectionKindInfo, type Connection } from '../types/connection.types';

    // The connections of a resource, in either direction. What goes through a connection, and how it works,
    // is shown and changed by selecting its edge on the canvas
    const props = defineProps<{
        connections: Connection[];
    }>();

    const partService = usePartService();
    const informationSourceService = useInformationSourceService();

    // A resource, or a script: "Nightly import (on Webshop)"
    function getName(partId: string) {
        return partService.getPartLabel(partId);
    }

    // A database or file location is read and written through a connection per direction. Both are shown as one row:
    // "Webshop ⇄ Orders db, reads & writes"
    interface ConnectionRow {
        key: string;
        connections: Connection[];
        route: string;
        description: string;
        icon: string;
        unknown: boolean;
    }

    const STORE_TYPES = ['database', 'table', 'fileLocation', 'file'];

    function isStore(connection: Connection, end: 'source' | 'target') {
        return STORE_TYPES.includes(connection[end].type);
    }

    const rows = computed<ConnectionRow[]>(() => {
        const result = new Map<string, ConnectionRow>();
        for (const connection of props.connections) {
            const storeEnd = isStore(connection, 'source') ? 'source' : isStore(connection, 'target') ? 'target' : undefined;
            if (!storeEnd || (connection.kind !== 'database' && connection.kind !== 'file')) {
                result.set(connection.id, {
                    key: connection.id,
                    connections: [connection],
                    route: `${getName(connection.source.id)} → ${getName(connection.target.id)}`,
                    description: informationSourceService.describeConnection(connection),
                    icon: getConnectionKindInfo(connection.kind).icon,
                    unknown: connection.kind === 'unknown'
                });
                continue;
            }

            const storeId = connection[storeEnd].id;
            const otherId = connection[storeEnd === 'source' ? 'target' : 'source'].id;
            const key = `${connection.kind}:${otherId}:${storeId}`;
            const row = result.get(key) ?? {
                key,
                connections: [],
                route: '',
                description: '',
                icon: getConnectionKindInfo(connection.kind).icon,
                unknown: false
            };
            row.connections.push(connection);
            // Read: from the database or file location to the other one
            const reads = row.connections.some(item => isStore(item, 'source'));
            const writes = row.connections.some(item => isStore(item, 'target'));
            row.route = reads && writes
                ? `${getName(otherId)} ⇄ ${getName(storeId)}`
                : reads ? `${getName(storeId)} → ${getName(otherId)}` : `${getName(otherId)} → ${getName(storeId)}`;
            row.description = `${getConnectionKindInfo(connection.kind).label}, ${reads && writes ? 'reads & writes' : reads ? 'reads' : 'writes'}`;
            result.set(key, row);
        }
        return [...result.values()];
    });
</script>

<template>
    <section v-collapsible class="detail-section">
        <div class="detail-section-title">
            <span>Connections</span>
            <span class="detail-count">{{ rows.length }}</span>
        </div>

        <div
            v-if="!connections.length"
            class="detail-empty"
        >
            No connections
        </div>

        <div
            v-for="row in rows"
            :key="row.key"
            class="detail-row"
            :class="{ unknown: row.unknown }"
            :title="row.description"
        >
            <i :class="row.icon" class="detail-row-icon" />
            <span class="detail-row-name connection-name">
                <span class="connection-route">{{ row.route }}</span>
                <span class="connection-kind">{{ row.description }}</span>
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
