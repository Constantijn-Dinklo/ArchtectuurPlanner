import { useApiStore } from "../stores/api.store";
import { useConnectionStore } from "../stores/connection.store";
import type { ResourceRelation } from "../stores/information/informationRelation.store";
import { usePartService } from "./part.service";
import { CONNECTION_KINDS, getConnectionKindInfo, type Connection, type ConnectionKind } from "../types/connection.types";

// One way information can go: an api of the sender, or another kind
export interface MethodOption {
    key: string;
    kind: ConnectionKind;
    apiId: string | null;
    label: string;
    icon: string;
}

// Which connection information comes through. A relation names its connection; this works out the connections it
// could go through instead, and how to show them
export function useInformationSourceService() {
    const apiStore = useApiStore();
    const connectionStore = useConnectionStore();
    const { getHolderIds } = usePartService();

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

    // What a relation goes through, as text: its connection
    function describeRelationRoute(relation: ResourceRelation) {
        const connection = connectionStore.getConnection(relation.connectionId);
        return connection ? describeConnection(connection) : undefined;
    }

    // How information can go from a sender to another application or external element: through one of the apis of
    // the sender, or one of the other ways. A database connection is only for databases, and 'not chosen yet' is no way
    function getApiMethodOptions(senderId: string): MethodOption[] {
        return apiStore.getApplicationApis(senderId).map(api => ({
            key: `api:${api.id}`, kind: 'api' as const, apiId: api.id, label: api.url, icon: getConnectionKindInfo('api').icon
        }));
    }

    function getOtherMethodOptions(): MethodOption[] {
        return CONNECTION_KINDS
            .filter(option => !['api', 'database', 'undecided'].includes(option.kind))
            .map(option => ({ key: option.kind, kind: option.kind, apiId: null, label: option.label, icon: option.icon }));
    }

    return { getHolderIds, getCarryingConnections, describeConnection, describeRelationRoute, getApiMethodOptions, getOtherMethodOptions };
}
