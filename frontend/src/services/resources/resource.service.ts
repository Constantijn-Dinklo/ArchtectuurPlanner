
import { computed } from "vue";

import { useDatabaseStore, type Database } from "../../stores/resources/database.store";
import { useApplicationStore, type Application } from "../../stores/resources/application.store";
import { useFileLocationStore, type FileLocation } from "../../stores/resources/fileLocation.store";
import { useServerStore, type Server } from "../../stores/resources/server.store";
import type { ResourceType } from "../../types/resource.type";
import { useTableStore, type Table } from "../../stores/resources/table.store";
import type { AccessibleInformationField, InformationField } from "../../types/informationField.type";
import { useApiConnectionStore } from "../../stores/apiConnection.store";
import { useDatabaseConnectionStore } from "../../stores/databaseConnection.store";
import { useScriptStore } from "../../stores/script.store";
import { useDatabaseService } from "./database.service";

export type Resource = Application | Database | FileLocation | Server | Table;

export function useResourceService() {
    const applicationStore = useApplicationStore();
    const databaseStore = useDatabaseStore();
    const fileLocationStore = useFileLocationStore();
    const serverStore = useServerStore();
    const tableStore = useTableStore();

    const databaseService = useDatabaseService();

    const apiConnectionStore = useApiConnectionStore();
    const databaseConnectionStore = useDatabaseConnectionStore();
    const scriptStore = useScriptStore();
    
    const resources = computed(() => {
        return [
            ...applicationStore.applications,
            ...databaseStore.databases,
            ...fileLocationStore.fileLocations,
            ...serverStore.servers,
            ...tableStore.tables
        ]
    });

    const resourceMap = computed(() => {
        const map = new Map<string, Resource>();

        for(const database of databaseStore.databases) {
            map.set(database.id, database);
        }
        for(const app of applicationStore.applications) {
            map.set(app.id, app);
        }
        for(const file of fileLocationStore.fileLocations){
            map.set(file.id, file);
        }
        for(const server of serverStore.servers){
            map.set(server.id, server);
        }
        for(const table of tableStore.tables){
            map.set(table.id, table);
        }
        return map;
    });

    function getResource(id: string): Resource | Database | undefined {
        return resourceMap.value.get(id);
    }

    function getByType(type: ResourceType | ResourceType[]){
        const types = Array.isArray(type) ? type : [type];

        return resources.value.filter(resource =>
            types.includes(resource.type)
        );
    }

    function getUpstreamResourceIdsViaDatabaseConnections(resourceId: string) {
        const upstreamDatabases = databaseConnectionStore.databaseConnections.flatMap(connection => {
            if (
                connection.operation.includes('read') &&
                connection.entityId === resourceId
            ) {
                return [connection.databaseId];
            }

            if (
                connection.operation.includes('write') &&
                connection.databaseId === resourceId
            ) {
                return [connection.entityId];
            }

            return [];
        });
        return upstreamDatabases;
    }

    function getUpstreamResourceIds(resourceId: string) {
        const apiConnectedResources = apiConnectionStore.apiConnections.filter((apiConnection) => apiConnection.targetId === resourceId).map((apiConnection) => apiConnection.sourceId);
        const upstreamResourceIdsViaDatabaseConnections = getUpstreamResourceIdsViaDatabaseConnections(resourceId);
        const scriptConnectedResources = scriptStore.scripts.filter((script) => script.outputIds.includes(resourceId)).flatMap((script) => script.inputIds);

        return [
            ...new Set([
                ...apiConnectedResources,
                ...upstreamResourceIdsViaDatabaseConnections,
                ...scriptConnectedResources
            ])
        ]
    }

    function getResourceInformationFields(resourceId: string): AccessibleInformationField[] {
        const resource = getResource(resourceId);
        if(!resource) { return []; }
        
        switch (resource.type) {
            case 'application':
                return resource.outputInformationFields.map((outputInformationField) => (
                    {
                        ...outputInformationField,
                        accessibleFromId: resource.id,
                        accessibleFromType: 'application'
                    }
                ));
            case 'database':
                const tables = databaseService.getDatabaseTables(resource.id);
                return tables.flatMap((table) => getResourceInformationFields(table.id))
            case 'table':
                return resource.columns.map((column) => {
                    return {
                        ...column,
                        accessibleFromId: resource.id,
                        accessibleFromType: 'table'
                    }
                }
            );
        }
        return [];
    }

    function getAccessibleInformationFields(resourceId: string): AccessibleInformationField[] {
        //For now I am only looking at the resource, so filter out any duplicates
        //TODO: Look at which information is actually send THROUGH the connection, not just which are available on the resource
        const upstreamResourceIds = getUpstreamResourceIds(resourceId);
        const informationFields = upstreamResourceIds.flatMap((upstreamResourceId) => getResourceInformationFields(upstreamResourceId))
        return informationFields;
    }

    return { getResource, getByType, getAccessibleInformationFields }
}