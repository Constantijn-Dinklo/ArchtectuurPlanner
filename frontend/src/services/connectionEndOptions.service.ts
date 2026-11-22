import { useApiStore } from "../stores/api.store";
import { useComponentStore } from "../stores/resources/component.store";
import { useInformationFieldStore } from "../stores/information/informationField.store";
import { useInformationObjectStore } from "../stores/information/informationObject.store";
import { useResourceService } from "./resources/resource.service";
import { useSendableInformationService } from "./sendableInformation.service";
import type { ConnectionEndTarget, InformationOption } from "../types/connectionEnd.types";

export function byLabel(options: Map<string, InformationOption>) {
    return [...options.values()].sort((a, b) => a.label.localeCompare(b.label));
}

// What can be read from one end of a connection: a file passes on what it contains, an api what it sends,
// a file location what its files contain, any other resource what it can send
export function useConnectionEndOptions() {
    const apiStore = useApiStore();
    const componentStore = useComponentStore();
    const informationFieldStore = useInformationFieldStore();
    const informationObjectStore = useInformationObjectStore();
    const resourceService = useResourceService();
    const sendableInformationService = useSendableInformationService();

    // The files whose contents can be read from this end: the file, or all files of a file location
    function getFiles(end: ConnectionEndTarget) {
        const file = componentStore.getComponent(end.resourceId);
        if (file?.kind === 'file') return [file];
        if (resourceService.getResource(end.resourceId)?.type !== 'fileLocation') return undefined;
        return componentStore.getResourceComponents(end.resourceId).filter(component => component.kind === 'file');
    }

    function getEndFieldOptions(end: ConnectionEndTarget, fields = new Map<string, InformationOption>()) {
        const files = getFiles(end);
        if (files) {
            files.flatMap(file => file.informationFieldIds).forEach(fieldId => {
                const field = informationFieldStore.getInformationField(fieldId);
                if (field) fields.set(field.id, { id: field.id, label: field.fieldName });
            });
            return fields;
        }

        const apiFieldIds = end.apiId ? apiStore.getApi(end.apiId)?.informationFieldIds ?? [] : undefined;
        sendableInformationService.getSendableFields(end.resourceId)
            .filter(field => !apiFieldIds || apiFieldIds.includes(field.id))
            .forEach(field => fields.set(field.id, { id: field.id, label: field.label }));
        return fields;
    }

    function getEndObjectOptions(end: ConnectionEndTarget, objects = new Map<string, InformationOption>()) {
        const files = getFiles(end);
        const apiObjectIds = end.apiId ? apiStore.getApi(end.apiId)?.informationObjectIds ?? [] : undefined;
        const objectIds = files
            ? files.flatMap(file => file.informationObjectIds)
            : sendableInformationService.getSendableObjects(end.resourceId)
                .map(object => object.id)
                .filter(objectId => !apiObjectIds || apiObjectIds.includes(objectId));
        objectIds.forEach(objectId => {
            const informationObject = informationObjectStore.getInformationObject(objectId);
            if (informationObject) objects.set(informationObject.id, { id: informationObject.id, label: informationObject.objectName });
        });
        return objects;
    }

    return { getEndFieldOptions, getEndObjectOptions };
}
