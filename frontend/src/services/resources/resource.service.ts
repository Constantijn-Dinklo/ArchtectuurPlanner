
import { computed } from "vue";

import { useDatabaseStore, type Database } from "../../stores/resources/database.store";
import { useApplicationStore} from "../../stores/resources/application.store";
import { useFileLocationStore, type FileLocation } from "../../stores/resources/fileLocation.store";
import { useServerStore, type Server } from "../../stores/resources/server.store";
import type { ResourceType } from "../../types/resource.type";
import { useTableStore, type Table } from "../../stores/resources/table.store";
import type { AccessibleInformationField } from "../../types/informationField.type";
import type { AccessibleInformationObject } from "../../types/informationObject.type";
import { useConnectionStore } from "../../stores/connection.store";
import { useComponentStore } from "../../stores/resources/component.store";
import { useDatabaseService } from "./database.service";
import type { Application, ResolvedApplication } from "../../types/application.types";
import type { External, ResolvedExternal } from "../../types/external.types";
import { useExternalStore } from "../../stores/resources/external.store";
import { useResourceResolver } from "../../resolvers/resource.resolver";
import { useInformationFieldStore } from "../../stores/information/informationField.store";
import { useInformationObjectStore } from "../../stores/information/informationObject.store";

export type Resource = Application | Database | FileLocation | Server | Table | External;
export type ResolvedResource = ResolvedApplication | Database | FileLocation | Server | Table | ResolvedExternal;

export function useResourceService() {
    const applicationStore = useApplicationStore();
    const databaseStore = useDatabaseStore();
    const fileLocationStore = useFileLocationStore();
    const serverStore = useServerStore();
    const tableStore = useTableStore();
    const externalStore = useExternalStore();

    const resourceResolver = useResourceResolver();

    const databaseService = useDatabaseService();

    const connectionStore = useConnectionStore();
    const componentStore = useComponentStore();
    const informationFieldStore = useInformationFieldStore();
    const informationObjectStore = useInformationObjectStore();
    
    const resources = computed(() => {
        return [
            ...applicationStore.applications,
            ...databaseStore.databases,
            ...fileLocationStore.fileLocations,
            ...serverStore.servers,
            ...tableStore.tables,
            ...externalStore.externals
        ]
    });

    const resourceMap = computed(() => {
        const map = new Map<string, Resource>();

        for(const app of applicationStore.applications) {
            map.set(app.id, app);
        }
        for(const database of databaseStore.databases) {
            map.set(database.id, database);
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
        for(const external of externalStore.externals){
            map.set(external.id, external);
        }
        return map;
    });

    function getResource(id: string): Resource | undefined {
        return resourceMap.value.get(id);
    }

    function getByType(type: ResourceType | ResourceType[]){
        const types = Array.isArray(type) ? type : [type];

        return resources.value.filter(resource =>
            types.includes(resource.type)
        );
    }

    function getUpstreamResourceIds(resourceId: string) {
        // The sources of the connections to the resource
        const connectedResources = connectionStore.connections
            .filter((connection) => connection.target.id === resourceId)
            .map((connection) => connection.source.id);
        return [...new Set(connectedResources)];
    }

    // includeObjectFields: also return the fields that are part of the output objects of an application,
    // for receivers that store fields individually (databases and their tables)
    // A script passes on what it produces, like the output of an application
    function getScriptOutputFields(scriptId: string, includeObjectFields: boolean): AccessibleInformationField[] {
        const script = componentStore.getComponent(scriptId);
        if(script?.kind !== 'script') { return []; }
        const fields = new Map<string, AccessibleInformationField>();
        const add = (fieldId: string, objectName?: string) => {
            const informationField = informationFieldStore.getInformationField(fieldId);
            if(!informationField) return;
            const field = fields.get(fieldId) ?? { ...informationField, accessibleFromId: scriptId, accessibleFromType: 'script' as const };
            if(objectName) field.objectNames = [...(field.objectNames ?? []), objectName];
            fields.set(fieldId, field);
        };
        script.outputInformationFieldIds.forEach((fieldId) => add(fieldId));
        if(includeObjectFields) {
            for(const objectId of script.outputInformationObjectIds) {
                const informationObject = informationObjectStore.getInformationObject(objectId);
                informationObject?.informationFieldIds.forEach((fieldId) => add(fieldId, informationObject.objectName));
            }
        }
        return [...fields.values()];
    }

    function getResourceInformationFields(resourceId: string, includeObjectFields: boolean = false): AccessibleInformationField[] {
        const resource = getResource(resourceId);
        if(!resource) { return getScriptOutputFields(resourceId, includeObjectFields); }
        const resolvedResource = resourceResolver.resolveResource(resource);
        
        switch (resolvedResource.type) {
            case 'application': {
                const fields = new Map<string, AccessibleInformationField>();

                for(const outputInformationField of resolvedResource.outputInformationFields) {
                    fields.set(outputInformationField.informationField.id, {
                        id: outputInformationField.informationField.id,
                        fieldName: outputInformationField.informationField.fieldName,
                        source: outputInformationField.informationField.source,
                        sourceMethod: outputInformationField.informationField.sourceMethod,
                        accessibleFromId: resource.id,
                        accessibleFromType: 'application'
                    });
                }

                if(includeObjectFields) {
                    for(const outputInformationObject of resolvedResource.outputInformationObjects) {
                        for(const informationField of outputInformationObject.informationObject.informationFields) {
                            const field = fields.get(informationField.id) ?? {
                                id: informationField.id,
                                fieldName: informationField.fieldName,
                                source: informationField.source,
                                sourceMethod: informationField.sourceMethod,
                                accessibleFromId: resource.id,
                                accessibleFromType: 'application',
                                objectNames: []
                            };
                            field.objectNames = [...(field.objectNames ?? []), outputInformationObject.informationObject.objectName];
                            fields.set(informationField.id, field);
                        }
                    }
                }

                return [...fields.values()];
            }
            case 'database':
                const tables = databaseService.getDatabaseTables(resolvedResource.id);
                return tables.flatMap((table) => getResourceInformationFields(table.id))
            case 'external':
                return resolvedResource.providedInformationFields.map((providedInformationField) => ({
                    id: providedInformationField.informationField.id,
                    fieldName: providedInformationField.informationField.fieldName,
                    source: providedInformationField.informationField.source,
                    sourceMethod: providedInformationField.informationField.sourceMethod,
                    accessibleFromId: resource.id,
                    accessibleFromType: 'external'
                }));
            case 'table':
                return resolvedResource.columns.map((column) => {
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
        // A database can store the fields of an information object that is written to it as separate columns
        const receivesObjectFields = getResource(resourceId)?.type === 'database';
        const informationFields = upstreamResourceIds.flatMap((upstreamResourceId) => getResourceInformationFields(upstreamResourceId, receivesObjectFields))
        return informationFields;
    }

    function getResourceInformationObjects(resourceId: string): AccessibleInformationObject[] {
        const resource = getResource(resourceId);
        if(!resource) {
            // A script passes on the objects it produces
            const script = componentStore.getComponent(resourceId);
            if(script?.kind !== 'script') { return []; }
            return script.outputInformationObjectIds.flatMap((objectId) => {
                const informationObject = informationObjectStore.getInformationObject(objectId);
                if(!informationObject) return [];
                const informationFields = informationObject.informationFieldIds
                    .map((fieldId) => informationFieldStore.getInformationField(fieldId))
                    .filter((field) => field !== undefined);
                return [{ ...informationObject, informationFields, accessibleFromId: resourceId, accessibleFromType: 'script' as const }];
            });
        }
        const resolvedResource = resourceResolver.resolveResource(resource);

        switch (resolvedResource.type) {
            case 'application':
                return resolvedResource.outputInformationObjects.map((outputInformationObject) => (
                    {
                        ...outputInformationObject.informationObject,
                        accessibleFromId: resource.id,
                        accessibleFromType: 'application'
                    }
                ));
            case 'external':
                return resolvedResource.providedInformationObjects.map((providedInformationObject) => ({
                    ...providedInformationObject.informationObject,
                    accessibleFromId: resource.id,
                    accessibleFromType: 'external'
                }));
        }
        return [];
    }

    function getAccessibleInformationObjects(resourceId: string): AccessibleInformationObject[] {
        const upstreamResourceIds = getUpstreamResourceIds(resourceId);
        return upstreamResourceIds.flatMap((upstreamResourceId) => getResourceInformationObjects(upstreamResourceId));
    }

    return { getResource, getByType, getUpstreamResourceIds, getResourceInformationFields, getResourceInformationObjects, getAccessibleInformationFields, getAccessibleInformationObjects }
}