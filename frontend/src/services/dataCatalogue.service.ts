import { useApiStore } from "../stores/api.store";
import { useDatabaseConnectionStore } from "../stores/databaseConnection.store";
import { useEndpointStore } from "../stores/endpoint.store";
import { useInformationFieldStore } from "../stores/information/informationField.store";
import { useInformationObjectStore } from "../stores/information/informationObject.store";
import { useInformationRelationStore } from "../stores/information/informationRelation.store";
import { useOtherConnectionStore } from "../stores/otherConnection.store";
import { useComponentStore } from "../stores/resources/component.store";
import { useDatabaseStore } from "../stores/resources/database.store";
import { useFileLocationStore } from "../stores/resources/fileLocation.store";
import { useServerStore } from "../stores/resources/server.store";
import { useTableStore } from "../stores/resources/table.store";
import { useApiConnectionService } from "./apiConnection.service";
import { useApplicationService } from "./resources/application.service";
import { useExternalService } from "./resources/external.service";
import { useScriptService } from "./script.service";

// The Data catalogue page works on all information and everything it passes through. The canvas loads most of that, but
// only for its level of detail and only once it has been opened, so the page loads everything it needs itself
export function useDataCatalogueService() {
    const informationFieldStore = useInformationFieldStore();
    const informationObjectStore = useInformationObjectStore();
    const informationRelationStore = useInformationRelationStore();
    const endpointStore = useEndpointStore();
    const componentStore = useComponentStore();
    const applicationService = useApplicationService();
    const databaseStore = useDatabaseStore();
    const tableStore = useTableStore();
    const fileLocationStore = useFileLocationStore();
    const serverStore = useServerStore();
    const externalService = useExternalService();
    const apiStore = useApiStore();
    const apiConnectionService = useApiConnectionService();
    const otherConnectionStore = useOtherConnectionStore();
    const databaseConnectionStore = useDatabaseConnectionStore();
    const scriptService = useScriptService();

    async function fetchDataCatalogue() {
        await Promise.all([
            informationFieldStore.fetchInformationFields(),
            informationObjectStore.fetchInformationObjects(),
            informationRelationStore.fetchInformationRelations(),
            endpointStore.fetchEndpoints(),
            componentStore.fetchComponents(),
            applicationService.fetchApplications(),
            databaseStore.fetchDatabases(),
            tableStore.fetchTables(),
            fileLocationStore.fetchFileLocations(),
            serverStore.fetchServers(),
            externalService.fetchExternals(),
            apiStore.fetchApis(),
            apiConnectionService.fetchApiConnections(),
            otherConnectionStore.fetchOtherConnections(),
            databaseConnectionStore.fetchDatabaseConnections(),
            scriptService.fetchScripts()
        ]);
    }

    return { fetchDataCatalogue };
}
