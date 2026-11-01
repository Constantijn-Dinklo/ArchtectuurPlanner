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
import { useResourceService } from "./resources/resource.service";
import type { InformationKind } from "./informationChain.service";
import { useScriptService } from "./script.service";
import type { SourceTarget } from "../types/informationField.type";

export interface SourceOption {
    id: string;
    name: string;
    target: SourceTarget;
}

export interface SourceOptionGroup {
    label: string;
    items: SourceOption[];
}

// The Data catalogue page and the information chains work on all information and everything it passes through. The canvas
// loads most of that, but only for its level of detail and only once it has been opened, so they load everything they need
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
    const resourceService = useResourceService();

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

    // Only what information lives in can be a source. Tables and files show what they are part of,
    // as they often share a name with those of another database or file location
    function getSourceOptions(): SourceOptionGroup[] {
        const toResourceOption = (id: string, name: string): SourceOption => ({ id, name, target: { resourceId: id } });
        const getParentName = (id: string) => resourceService.getResource(id)?.name ?? 'Unknown resource';

        return [
            {
                label: 'Applications',
                items: resourceService.getByType('application').map(application => toResourceOption(application.id, application.name))
            },
            {
                label: 'Externals',
                items: resourceService.getByType('external').map(external => toResourceOption(external.id, external.name))
            },
            {
                label: 'Tables',
                items: tableStore.tables.map(table => toResourceOption(table.id, `${getParentName(table.databaseId)} › ${table.name}`))
            },
            {
                label: 'Files',
                items: componentStore.components
                    .filter(component => component.kind === 'file')
                    .map(file => ({
                        id: file.id,
                        name: `${getParentName(file.resourceId)} › ${file.name}`,
                        target: { resourceId: file.resourceId, componentId: file.id }
                    }))
            }
        ]
            .map(group => ({ ...group, items: group.items.sort((a, b) => a.name.localeCompare(b.name)) }))
            .filter(group => group.items.length);
    }

    // The source also gets the information, so what that place holds is fetched again
    async function setSource(kind: InformationKind, id: string, target: SourceTarget | null) {
        const { source } = kind === 'field'
            ? await informationFieldStore.setSource(id, target)
            : await informationObjectStore.setSource(id, target);

        if (source?.componentId) await componentStore.fetchComponents();
        else if (source?.resourceType === 'application') await applicationService.fetchApplications();
        else if (source?.resourceType === 'external') await externalService.fetchExternals();
        else if (source?.resourceType === 'table') await tableStore.fetchTables();
    }

    return { fetchDataCatalogue, getSourceOptions, setSource };
}
