import { useApiStore } from "../stores/api.store";
import { useConnectionStore } from "../stores/connection.store";
import type { ResourceRelation } from "../stores/information/informationRelation.store";
import { useComponentStore } from "../stores/resources/component.store";
import { useResourceService } from "./resources/resource.service";
import { getConnectionKindInfo, type Connection } from "../types/connection.types";

// Which connection information comes through. A relation names its connection; this works out the connections it
// could go through instead, and how to show them
export function useInformationSourceService() {
    const apiStore = useApiStore();
    const connectionStore = useConnectionStore();
    const componentStore = useComponentStore();
    const resourceService = useResourceService();

    // A part and the parts it is inside of: a table is inside its database
    function getHolderIds(resourceId: string) {
        const resource = resourceService.getResource(resourceId);
        return resource?.type === 'table' ? [resourceId, resource.databaseId] : [resourceId];
    }

    // The connections information can go through from the source to the target: their ends are those parts, or hold them
    function getCarryingConnections(sourceId: string, targetId: string): Connection[] {
        const sourceIds = getHolderIds(sourceId);
        const targetIds = getHolderIds(targetId);
        return connectionStore.connections.filter(connection =>
            sourceIds.includes(connection.source.id) && targetIds.includes(connection.target.id)
        );
    }

    // E.g. "API https://…/orders", "By hand: weekly export", "Unknown"
    function describeConnection(connection: Connection) {
        const kind = connection.kind === 'api'
            ? `API ${apiStore.getApi(connection.apiId)?.url ?? ''}`.trim()
            : getConnectionKindInfo(connection.kind).label;
        return connection.description ? `${kind}: ${connection.description}` : kind;
    }

    // What a relation goes through, as text: its connection, or the script it goes through
    function describeRelationRoute(relation: ResourceRelation) {
        if (relation.scriptId) {
            const script = componentStore.getComponent(relation.scriptId);
            const host = script ? resourceService.getResource(script.resourceId)?.name : undefined;
            return `Script ${script?.name ?? '?'}${host ? ` (on ${host})` : ''}`;
        }
        const connection = connectionStore.getConnection(relation.connectionId);
        return connection ? describeConnection(connection) : undefined;
    }

    return { getHolderIds, getCarryingConnections, describeConnection, describeRelationRoute };
}
