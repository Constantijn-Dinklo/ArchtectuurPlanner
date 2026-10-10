<script setup lang="ts">
    import { vCollapsible } from '../../directives/collapsible';
    import { computed, ref } from 'vue';
    import { useApiConnectionStore } from '../../stores/apiConnection.store';
    import { useApiStore } from '../../stores/api.store';
    import { useScriptStore } from '../../stores/script.store';
    import { useDatabaseConnectionStore } from '../../stores/databaseConnection.store';
    import { getOtherConnectionMethodInfo, useOtherConnectionStore } from '../../stores/otherConnection.store';
    import { useResourceService } from '../../services/resources/resource.service';
    import type { ResourceType } from '../../types/resource.type';

    // The resources on the other side of the connections of this resource, grouped per resource:
    // incoming: the resources that send to this resource (this resource is the target)
    // outgoing: the resources this resource sends to (this resource is the source)
    const props = defineProps<{
        resourceId: string;
        direction: 'incoming' | 'outgoing';
    }>();

    interface PartnerConnection {
        key: string;
        icon: string;
        label: string;
        // Extra information, e.g. the url of an api or the description of an other connection
        detail?: string;
        warning?: string;
    }

    interface ConnectedResource {
        resourceId: string;
        name: string;
        type?: ResourceType;
        connections: PartnerConnection[];
    }

    const apiConnectionStore = useApiConnectionStore();
    const apiStore = useApiStore();
    const scriptStore = useScriptStore();
    const databaseConnectionStore = useDatabaseConnectionStore();
    const otherConnectionStore = useOtherConnectionStore();
    const resourceService = useResourceService();

    const RESOURCE_ICONS: Record<ResourceType, string> = {
        application: 'pi pi-desktop',
        database: 'pi pi-database',
        table: 'pi pi-table',
        fileLocation: 'pi pi-folder',
        server: 'pi pi-server',
        external: 'pi pi-globe'
    };

    const isIncoming = computed(() => props.direction === 'incoming');

    // Every connection has a source and a target; this resource is on one side, the partner on the other
    function getPartnerId(sourceId: string | null | undefined, targetId: string | null | undefined) {
        if (isIncoming.value) {
            return targetId === props.resourceId ? sourceId || undefined : undefined;
        }
        return sourceId === props.resourceId ? targetId || undefined : undefined;
    }

    const sources = computed<ConnectedResource[]>(() => {
        const byResource = new Map<string, ConnectedResource>();

        function add(partnerId: string, connection: PartnerConnection) {
            const resource = resourceService.getResource(partnerId);
            const partner = byResource.get(partnerId) ?? {
                resourceId: partnerId,
                name: resource?.name ?? 'Unknown resource',
                type: resource?.type,
                connections: []
            };
            partner.connections.push(connection);
            byResource.set(partnerId, partner);
        }

        for (const connection of apiConnectionStore.apiConnections) {
            const partnerId = getPartnerId(connection.sourceId, connection.targetId);
            if (!partnerId) continue;
            const url = apiStore.getApi(connection.sourceUrlId);
            add(partnerId, {
                key: `api:${connection.id}`,
                icon: 'pi pi-globe',
                label: 'API',
                detail: url?.url,
                warning: url ? undefined : 'No url selected'
            });
        }

        // A script reads from its inputs and writes to its outputs
        for (const script of scriptStore.scripts) {
            const partnerIds = isIncoming.value
                ? (script.outputIds.includes(props.resourceId) ? script.inputIds : [])
                : (script.inputIds.includes(props.resourceId) ? script.outputIds : []);
            for (const partnerId of new Set(partnerIds.filter(id => id && id !== props.resourceId))) {
                add(partnerId, {
                    key: `script:${script.id}:${partnerId}`,
                    icon: 'pi pi-code',
                    label: 'Script',
                    detail: script.name
                });
            }
        }

        // Data flows in the direction of the database connection: read is database -> resource, write is resource -> database
        for (const connection of databaseConnectionStore.databaseConnections) {
            if (connection.operation.includes('read')) {
                const partnerId = getPartnerId(connection.databaseId, connection.entityId);
                if (partnerId) add(partnerId, { key: `database-read:${connection.id}`, icon: 'pi pi-database', label: 'Database read' });
            }
            if (connection.operation.includes('write')) {
                const partnerId = getPartnerId(connection.entityId, connection.databaseId);
                if (partnerId) add(partnerId, { key: `database-write:${connection.id}`, icon: 'pi pi-database', label: 'Database write' });
            }
        }

        for (const connection of otherConnectionStore.otherConnections) {
            const partnerId = getPartnerId(connection.sourceId, connection.targetId);
            if (!partnerId) continue;
            const method = getOtherConnectionMethodInfo(connection.method);
            add(partnerId, {
                key: `other:${connection.id}`,
                icon: method.icon,
                label: method.label,
                detail: connection.description || undefined
            });
        }

        return [...byResource.values()].sort((a, b) => a.name.localeCompare(b.name));
    });

    // A source with several connections can be expanded to show them; it starts collapsed
    const expandedSources = ref<Set<string>>(new Set());

    function toggleSource(resourceId: string) {
        const expanded = new Set(expandedSources.value);
        if (expanded.has(resourceId)) {
            expanded.delete(resourceId);
        } else {
            expanded.add(resourceId);
        }
        expandedSources.value = expanded;
    }

    function hasWarning(source: ConnectedResource) {
        return source.connections.some(connection => connection.warning);
    }

    function connectionText(connection: PartnerConnection) {
        return connection.detail ? `${connection.label} · ${connection.detail}` : connection.label;
    }
</script>

<template>
    <section v-collapsible class="detail-section">
        <div class="detail-section-title">
            <span>{{ isIncoming ? 'Receives from' : 'Sends to' }}</span>
            <span class="detail-count">{{ sources.length }}</span>
        </div>

        <div
            v-if="!sources.length"
            class="detail-empty"
        >
            {{ isIncoming ? 'No resource sends to this through a connection' : 'This does not send to any resource through a connection' }}
        </div>

        <div
            v-for="source in sources"
            :key="source.resourceId"
            class="incoming-source"
        >
            <!-- Several connections: an expandable row -->
            <button
                v-if="source.connections.length > 1"
                type="button"
                class="detail-row incoming-row expandable"
                :class="{ warning: hasWarning(source) }"
                @click="toggleSource(source.resourceId)"
            >
                <i
                    class="pi pi-chevron-right expand-icon"
                    :class="{ expanded: expandedSources.has(source.resourceId) }"
                />
                <i :class="RESOURCE_ICONS[source.type ?? 'application']" class="detail-row-icon" />
                <span class="detail-row-name">{{ source.name }}</span>
                <span class="detail-count">{{ source.connections.length }} connections</span>
            </button>

            <!-- One connection: shown directly -->
            <div
                v-else
                class="detail-row incoming-row"
                :class="{ warning: hasWarning(source) }"
                :title="source.connections[0]!.warning"
            >
                <span class="expand-spacer" />
                <i :class="RESOURCE_ICONS[source.type ?? 'application']" class="detail-row-icon" />
                <span class="detail-row-name">{{ source.name }}</span>
                <span class="connection-summary">
                    <i :class="source.connections[0]!.icon" />
                    {{ connectionText(source.connections[0]!) }}
                </span>
            </div>

            <ul
                v-if="source.connections.length > 1 && expandedSources.has(source.resourceId)"
                class="incoming-connections"
            >
                <li
                    v-for="connection in source.connections"
                    :key="connection.key"
                    class="incoming-connection"
                    :class="{ warning: connection.warning }"
                    :title="connection.warning"
                >
                    <i :class="connection.icon" />
                    <span class="connection-text">{{ connectionText(connection) }}</span>
                    <span v-if="connection.warning" class="connection-warning">{{ connection.warning }}</span>
                </li>
            </ul>
        </div>
    </section>
</template>

<style scoped>
.incoming-row {
    width: 100%;
    box-sizing: border-box;

    border: 0;
    background: transparent;

    color: inherit;
    font: inherit;
    text-align: left;
}

.incoming-row.expandable {
    cursor: pointer;
}

.incoming-row.warning {
    background: #fffbeb;
    color: #b45309;
}

.expand-icon,
.expand-spacer {
    flex: 0 0 auto;
    width: 10px;
}

.expand-icon {
    color: #94a3b8;
    font-size: 9px;

    transition: transform 0.15s ease;
}

.expand-icon.expanded {
    transform: rotate(90deg);
}

.connection-summary {
    display: inline-flex;
    flex: 0 1 auto;
    align-items: center;
    gap: 4px;
    min-width: 0;
    max-width: 55%;
    overflow: hidden;

    color: #94a3b8;
    font-size: 10px;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.connection-summary .pi {
    font-size: 9px;
}

.incoming-connections {
    margin: 0 0 4px 22px;
    padding: 0 0 0 8px;
    border-left: 1px solid #e2e8f0;
    list-style: none;
}

.incoming-connection {
    display: flex;
    align-items: center;
    gap: 6px;

    min-height: 22px;
    padding: 0 6px;
    border-radius: 5px;

    color: #475569;
    font-size: 11px;
}

.incoming-connection .pi {
    color: #94a3b8;
    font-size: 10px;
}

.incoming-connection.warning {
    background: #fffbeb;
    color: #b45309;
}

.connection-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.connection-warning {
    flex: 0 0 auto;
    font-size: 10px;
    font-weight: 600;
}
</style>
