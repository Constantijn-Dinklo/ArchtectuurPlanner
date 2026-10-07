import { useResourceService } from "./resources/resource.service";
import { useResourceResolver } from "../resolvers/resource.resolver";
import { useDatabaseService } from "./resources/database.service";
import { useEndpointStore } from "../stores/endpoint.store";
import { useInformationRelationStore } from "../stores/information/informationRelation.store";
import { useInformationFieldStore } from "../stores/information/informationField.store";
import { useInformationObjectStore } from "../stores/information/informationObject.store";
import type { InformationField } from "../types/informationField.type";

export interface HeldField {
    id: string;
    fieldName: string;
    // The objects of the resource the field is part of; empty when the resource has it as a standalone field
    objectNames: string[];
    label: string;
}

export interface HeldObject {
    id: string;
    objectName: string;
}

// The information a resource holds, and therefore can show in its endpoints:
// - an application: its input and output fields and objects, including the fields inside those objects
// - a table: its columns, a database: the columns of its tables
// - other resources: the information that flows into them through relations
export function useEndpointInformationService() {
    const resourceService = useResourceService();
    const resourceResolver = useResourceResolver();
    const databaseService = useDatabaseService();
    const endpointStore = useEndpointStore();
    const informationRelationStore = useInformationRelationStore();
    const informationFieldStore = useInformationFieldStore();
    const informationObjectStore = useInformationObjectStore();

    function getHeldFields(resourceId: string): HeldField[] {
        const resource = resourceService.getResource(resourceId);
        if (!resource) return [];
        const resolvedResource = resourceResolver.resolveResource(resource);

        const fields = new Map<string, HeldField>();
        function addField(field: InformationField, objectName?: string) {
            const heldField = fields.get(field.id) ?? { id: field.id, fieldName: field.fieldName, objectNames: [], label: field.fieldName };
            if (objectName && !heldField.objectNames.includes(objectName)) {
                heldField.objectNames.push(objectName);
                heldField.label = `${field.fieldName} (${heldField.objectNames.join(', ')})`;
            }
            fields.set(field.id, heldField);
        }

        switch (resolvedResource.type) {
            case 'application':
                [...resolvedResource.inputInformationFields, ...resolvedResource.outputInformationFields]
                    .forEach(reference => addField(reference.informationField));
                [...resolvedResource.inputInformationObjects, ...resolvedResource.outputInformationObjects]
                    .forEach(reference => reference.informationObject.informationFields
                        .forEach(field => addField(field, reference.informationObject.objectName)));
                break;
            case 'table':
                resolvedResource.columns.forEach(column => addField(column));
                break;
            case 'database':
                databaseService.getDatabaseTables(resolvedResource.id)
                    .forEach(table => table.columns.forEach(column => addField(column)));
                break;
            default:
                informationRelationStore.fieldRelations
                    .filter(relation => relation.targetResourceId === resourceId)
                    .forEach(relation => {
                        const field = informationFieldStore.getInformationField(relation.informationFieldId);
                        if (field) addField(field);
                    });
        }

        return [...fields.values()];
    }

    function getHeldObjects(resourceId: string): HeldObject[] {
        const resource = resourceService.getResource(resourceId);
        if (!resource) return [];
        const resolvedResource = resourceResolver.resolveResource(resource);

        if (resolvedResource.type === 'application') {
            const objects = new Map<string, HeldObject>();
            [...resolvedResource.inputInformationObjects, ...resolvedResource.outputInformationObjects]
                .forEach(reference => objects.set(reference.informationObject.id, {
                    id: reference.informationObject.id,
                    objectName: reference.informationObject.objectName
                }));
            return [...objects.values()];
        }

        return informationRelationStore.objectRelations
            .filter(relation => relation.targetResourceId === resourceId)
            .map(relation => informationObjectStore.getInformationObject(relation.informationObjectId))
            .filter(informationObject => informationObject !== undefined)
            .map(informationObject => ({ id: informationObject.id, objectName: informationObject.objectName }));
    }

    // Whether the field is used in an endpoint of the resource, directly or inside an object
    function isFieldInEndpoint(resourceId: string, informationFieldId: string) {
        return endpointStore.getResourceEndpoints(resourceId).some(endpoint =>
            endpoint.informationFieldIds.includes(informationFieldId) ||
            endpoint.informationObjectIds.some(objectId =>
                informationObjectStore.getInformationObject(objectId)?.informationFieldIds.includes(informationFieldId)
            )
        );
    }

    function isObjectInEndpoint(resourceId: string, informationObjectId: string) {
        return endpointStore.getResourceEndpoints(resourceId).some(endpoint =>
            endpoint.informationObjectIds.includes(informationObjectId)
        );
    }

    return { getHeldFields, getHeldObjects, isFieldInEndpoint, isObjectInEndpoint };
}
