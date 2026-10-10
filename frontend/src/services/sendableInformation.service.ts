import { useResourceService } from "./resources/resource.service";
import { useResourceResolver } from "../resolvers/resource.resolver";

export interface SendableField {
    id: string;
    fieldName: string;
    // The output objects the field is part of; empty when it is only a standalone output field
    objectNames: string[];
    label: string;
}

export interface SendableObject {
    id: string;
    objectName: string;
}

// The information a resource can pass on to another resource.
// An application passes on its output: standalone output fields, the fields of its output objects and the output objects.
// An external element passes on what it provides, in the same way.
// Other resources (databases, tables) pass on their columns.
export function useSendableInformationService() {
    const resourceService = useResourceService();
    const resourceResolver = useResourceResolver();

    function getSendableFields(resourceId: string): SendableField[] {
        const resource = resourceService.getResource(resourceId);
        if (!resource) return [];

        const resolvedResource = resourceResolver.resolveResource(resource);
        const fields = new Map<string, SendableField>();

        // An external element passes on what it provides, including the fields inside its provided objects
        if (resolvedResource.type === 'external') {
            for (const reference of resolvedResource.providedInformationFields) {
                const field = reference.informationField;
                fields.set(field.id, { id: field.id, fieldName: field.fieldName, objectNames: [], label: field.fieldName });
            }
            for (const reference of resolvedResource.providedInformationObjects) {
                for (const field of reference.informationObject.informationFields) {
                    const sendableField = fields.get(field.id) ?? { id: field.id, fieldName: field.fieldName, objectNames: [], label: field.fieldName };
                    sendableField.objectNames.push(reference.informationObject.objectName);
                    sendableField.label = `${field.fieldName} (${sendableField.objectNames.join(', ')})`;
                    fields.set(field.id, sendableField);
                }
            }
            return [...fields.values()];
        }

        if (resolvedResource.type !== 'application') {
            for (const field of resourceService.getResourceInformationFields(resourceId)) {
                fields.set(field.id, { id: field.id, fieldName: field.fieldName, objectNames: [], label: field.fieldName });
            }
            return [...fields.values()];
        }

        for (const reference of resolvedResource.outputInformationFields) {
            const field = reference.informationField;
            fields.set(field.id, { id: field.id, fieldName: field.fieldName, objectNames: [], label: field.fieldName });
        }

        for (const reference of resolvedResource.outputInformationObjects) {
            for (const field of reference.informationObject.informationFields) {
                const sendableField = fields.get(field.id) ?? { id: field.id, fieldName: field.fieldName, objectNames: [], label: field.fieldName };
                sendableField.objectNames.push(reference.informationObject.objectName);
                sendableField.label = `${field.fieldName} (${sendableField.objectNames.join(', ')})`;
                fields.set(field.id, sendableField);
            }
        }

        return [...fields.values()];
    }

    function getSendableObjects(resourceId: string): SendableObject[] {
        return resourceService.getResourceInformationObjects(resourceId)
            .map(informationObject => ({ id: informationObject.id, objectName: informationObject.objectName }));
    }

    return { getSendableFields, getSendableObjects };
}
