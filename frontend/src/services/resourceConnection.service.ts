import api from "../helpers/axios";
import { useDatabaseConnectionStore } from "../stores/databaseConnection.store";
import { useOtherConnectionStore } from "../stores/otherConnection.store";
import { useInformationRelationStore } from "../stores/information/informationRelation.store";
import { useTableStore } from "../stores/resources/table.store";
import { useApiConnectionService } from "./apiConnection.service";
import { useApplicationService } from "./resources/application.service";
import { useExternalService } from "./resources/external.service";

// Information that one resource receives from another, added by hand
export interface RelationToAdd {
    kind: 'field' | 'object';
    informationId: string;
    sourceResourceId: string;
    targetResourceId: string;
}

// Connecting resources and what goes between them. The backend decides what kind of connection that takes
// (a database connection, or an other connection when there is no api connection yet) and which connection
// carries the information, so afterwards everything that can change is loaded again
export function useResourceConnectionService() {
    const apiConnectionService = useApiConnectionService();
    const databaseConnectionStore = useDatabaseConnectionStore();
    const otherConnectionStore = useOtherConnectionStore();
    const informationRelationStore = useInformationRelationStore();
    const applicationService = useApplicationService();
    const tableStore = useTableStore();
    const externalService = useExternalService();

    async function refresh() {
        await Promise.all([
            apiConnectionService.fetchApiConnections(),
            databaseConnectionStore.fetchDatabaseConnections(),
            otherConnectionStore.fetchOtherConnections(),
            informationRelationStore.fetchInformationRelations(),
            applicationService.fetchApplications(),
            tableStore.fetchTables(),
            externalService.fetchExternals()
        ]);
    }

    async function connect(sourceId: string, targetId: string) {
        await api.post('/resourceConnections', { sourceId, targetId });
        await refresh();
    }

    // Removes the connections between the two and everything that goes through them
    async function disconnect(sourceId: string, targetId: string) {
        await api.delete(`/resourceConnections/${sourceId}/${targetId}`);
        await refresh();
    }

    // The receiver gets the information as well
    async function addRelation(relation: RelationToAdd) {
        await api.post('/informationRelations', relation);
        await refresh();
    }

    async function removeRelations(relations: { kind: 'field' | 'object', id: string }[]) {
        try {
            for (const relation of relations) {
                await api.delete(`/informationRelations/${relation.kind === 'field' ? 'fields' : 'objects'}/${relation.id}`);
            }
        }
        finally {
            await refresh();
        }
    }

    return { connect, disconnect, addRelation, removeRelations };
}
