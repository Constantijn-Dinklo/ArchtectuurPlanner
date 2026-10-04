import { useApiConnectionStore } from "../stores/apiConnection.store";
import { useApiStore } from "../stores/api.store";
import { useScriptStore } from "../stores/script.store";
import { useDatabaseConnectionStore } from "../stores/databaseConnection.store";
import { useHumanConnectionStore } from "../stores/humanConnection.store";
import { useInformationObjectStore } from "../stores/information/informationObject.store";
import type { ConnectionType, ResourceRelation } from "../stores/information/informationRelation.store";
import { useResourceService } from "./resources/resource.service";

// What travels from the source to the target
export type CarriedInformation =
    | { informationFieldId: string }
    | { informationObjectId: string };

// A connection the information can travel through from the source to the target
export interface CandidateConnection {
    type: ConnectionType;
    id: string;
    label: string;
}

export interface ResolvedVia {
    candidates: CandidateConnection[];
    // The connection the information comes through: the one chosen by the user,
    // or the only candidate when there is just one
    selected?: CandidateConnection;
    // There are several candidates and the user has not chosen one yet
    needsChoice: boolean;
}

// Works out through which api, script, database connection or human connection information comes from another resource.
// Api urls and human connections list the information they carry. Scripts and database connections do not,
// so every script or database connection between the two resources can carry anything.
export function useInformationSourceService() {
    const apiConnectionStore = useApiConnectionStore();
    const apiStore = useApiStore();
    const scriptStore = useScriptStore();
    const databaseConnectionStore = useDatabaseConnectionStore();
    const humanConnectionStore = useHumanConnectionStore();
    const informationObjectStore = useInformationObjectStore();
    const resourceService = useResourceService();

    function carries(carrier: { informationFieldIds?: string[], informationObjectIds?: string[] }, information: CarriedInformation) {
        if ('informationObjectId' in information) {
            return carrier.informationObjectIds?.includes(information.informationObjectId) ?? false;
        }
        if (carrier.informationFieldIds?.includes(information.informationFieldId)) return true;
        // A field also travels inside an object that is carried
        return (carrier.informationObjectIds ?? []).some(objectId =>
            informationObjectStore.getInformationObject(objectId)?.informationFieldIds.includes(information.informationFieldId)
        );
    }

    // Tables are connected through their database
    function getDatabaseId(resourceId: string) {
        const resource = resourceService.getResource(resourceId);
        if (resource?.type === 'table') return resource.databaseId;
        if (resource?.type === 'database') return resource.id;
        return undefined;
    }

    function getCandidateConnections(sourceId: string, targetId: string, information: CarriedInformation): CandidateConnection[] {
        const candidates: CandidateConnection[] = [];

        for (const apiConnection of apiConnectionStore.apiConnections) {
            if (apiConnection.sourceId !== sourceId || apiConnection.targetId !== targetId) continue;
            const url = apiStore.getApi(apiConnection.sourceUrlId);
            if (!url || !carries(url, information)) continue;
            candidates.push({ type: 'api', id: apiConnection.id, label: `API ${url.url}` });
        }

        for (const humanConnection of humanConnectionStore.humanConnections) {
            if (humanConnection.sourceId !== sourceId || humanConnection.targetId !== targetId) continue;
            if (!carries(humanConnection, information)) continue;
            candidates.push({
                type: 'human',
                id: humanConnection.id,
                label: `Human${humanConnection.description ? `: ${humanConnection.description}` : ''}`
            });
        }

        const sourceIds = [sourceId, getDatabaseId(sourceId)].filter(id => id !== undefined);
        const targetIds = [targetId, getDatabaseId(targetId)].filter(id => id !== undefined);

        for (const script of scriptStore.scripts) {
            const readsSource = script.inputIds.some(inputId => sourceIds.includes(inputId));
            const writesTarget = script.outputIds.some(outputId => targetIds.includes(outputId));
            if (readsSource && writesTarget) {
                candidates.push({ type: 'script', id: script.id, label: `Script ${script.name}` });
            }
        }

        for (const databaseConnection of databaseConnectionStore.databaseConnections) {
            const readFromSource = databaseConnection.operation.includes('read')
                && sourceIds.includes(databaseConnection.databaseId)
                && databaseConnection.entityId === targetId;
            const writtenToTarget = databaseConnection.operation.includes('write')
                && targetIds.includes(databaseConnection.databaseId)
                && databaseConnection.entityId === sourceId;
            if (readFromSource || writtenToTarget) {
                const databaseName = resourceService.getResource(databaseConnection.databaseId)?.name ?? 'database';
                candidates.push({
                    type: 'database',
                    id: databaseConnection.id,
                    label: `DB ${readFromSource ? 'read from' : 'write to'} ${databaseName}`
                });
            }
        }

        return candidates;
    }

    function resolveVia(relation: ResourceRelation, information: CarriedInformation): ResolvedVia {
        const candidates = getCandidateConnections(relation.sourceResourceId, relation.targetResourceId, information);

        const chosen = candidates.find(candidate =>
            candidate.type === relation.viaConnectionType && candidate.id === relation.viaConnectionId
        );
        const selected = chosen ?? (candidates.length === 1 ? candidates[0] : undefined);

        return {
            candidates,
            selected,
            needsChoice: candidates.length > 1 && !chosen
        };
    }

    // Short text for a dropdown option: where the information would come from
    function describeCandidates(sourceId: string, targetId: string, information: CarriedInformation) {
        const candidates = getCandidateConnections(sourceId, targetId, information);
        if (!candidates.length) return '(none)';
        if (candidates.length === 1) return `via ${candidates[0]!.label}`;
        return `via ${candidates.length} connections`;
    }

    return { getCandidateConnections, resolveVia, describeCandidates };
}
