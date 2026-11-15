import { computed } from "vue";
import { useInformationRelationStore, type ResourceRelation } from "../stores/information/informationRelation.store";
import { useInformationObjectStore } from "../stores/information/informationObject.store";
import { useInformationFieldStore } from "../stores/information/informationField.store";
import { useApiStore } from "../stores/api.store";
import { useConnectionStore } from "../stores/connection.store";
import { useResourceService } from "./resources/resource.service";
import { useComponentStore } from "../stores/resources/component.store";
import { useInformationSourceService } from "./informationSource.service";

// A problem with the information transfer between two resources, with what to do about it
export interface ConnectionWarning {
    severity: 'error' | 'warning';
    title: string;
    // The information or connections the warning is about
    items: string[];
    hint: string;
}

// Every relation goes through a connection. What can still be wrong or unclear about it:
// - it goes through an api that does not send it (a field also counts as sent when an object it is part of is sent)
// - it goes through a connection of which nobody knows yet how it works
export function useInformationTransferService() {
    const informationRelationStore = useInformationRelationStore();
    const informationObjectStore = useInformationObjectStore();
    const informationFieldStore = useInformationFieldStore();
    const apiStore = useApiStore();
    const connectionStore = useConnectionStore();
    const resourceService = useResourceService();
    const componentStore = useComponentStore();
    const informationSourceService = useInformationSourceService();

    // Whether the api of the relation's connection sends the information; true when it does not go through an api
    function isSentByApi(relation: ResourceRelation, information: { informationFieldId: string } | { informationObjectId: string }) {
        const connection = connectionStore.getConnection(relation.connectionId);
        if (connection?.kind !== 'api') return true;
        const api = apiStore.getApi(connection.apiId);
        if (!api) return false;
        if ('informationObjectId' in information) return api.informationObjectIds.includes(information.informationObjectId);
        if (api.informationFieldIds.includes(information.informationFieldId)) return true;
        return api.informationObjectIds.some(objectId =>
            informationObjectStore.getInformationObject(objectId)?.informationFieldIds.includes(information.informationFieldId)
        );
    }

    const unsentFieldRelations = computed(() =>
        informationRelationStore.fieldRelations.filter(relation => !isSentByApi(relation, relation))
    );

    const unsentObjectRelations = computed(() =>
        informationRelationStore.objectRelations.filter(relation => !isSentByApi(relation, relation))
    );

    // Keyed by `${targetResourceId}:${informationId}`, the value is the id of the resource it comes from
    const unsentInputFields = computed(() => new Map(
        unsentFieldRelations.value.map(relation => [`${relation.targetResourceId}:${relation.informationFieldId}`, relation.sourceResourceId])
    ));

    const unsentInputObjects = computed(() => new Map(
        unsentObjectRelations.value.map(relation => [`${relation.targetResourceId}:${relation.informationObjectId}`, relation.sourceResourceId])
    ));

    // Returns the id of the resource the input field comes from through an api that does not send it
    function getUnsentInputFieldSource(applicationId: string, informationFieldId: string) {
        return unsentInputFields.value.get(`${applicationId}:${informationFieldId}`);
    }

    function getUnsentInputObjectSource(applicationId: string, informationObjectId: string) {
        return unsentInputObjects.value.get(`${applicationId}:${informationObjectId}`);
    }

    // The names of the information of these relations, objects first
    function getNames(fieldRelations: { informationFieldId: string }[], objectRelations: { informationObjectId: string }[]) {
        return [
            ...new Set(objectRelations.map(relation => `▱ ${informationObjectStore.getInformationObject(relation.informationObjectId)?.objectName ?? 'Unknown object'}`)),
            ...new Set(fieldRelations.map(relation => informationFieldStore.getInformationField(relation.informationFieldId)?.fieldName ?? 'Unknown field'))
        ];
    }

    // A script is connected to a database or file location without a table or file being chosen. An edge only goes to
    // the script itself from the database level on (before that it goes to its host), so this only shows on that level
    function getMissingPartWarning(sourceId: string, targetId: string): ConnectionWarning | undefined {
        const reader = componentStore.getComponent(targetId);
        const writer = componentStore.getComponent(sourceId);
        const script = reader ?? writer;
        const resource = resourceService.getResource(reader ? sourceId : targetId);
        if (script?.kind !== 'script' || (resource?.type !== 'database' && resource?.type !== 'fileLocation')) return undefined;

        const ends = reader ? script.inputs : script.outputs;
        if (!ends.some(end => end.resourceId === resource.id && !end.componentId)) return undefined;

        const noun = resource.type === 'database' ? 'table' : 'file';
        return {
            severity: 'warning',
            title: `No ${noun} chosen`,
            items: [`${script.name} ${reader ? 'reads from' : 'writes to'} ${resource.name}`],
            hint: `Open ${script.name} and choose the ${noun} under ${reader ? 'Reads from' : 'Writes to'}.`
        };
    }

    // All warnings for what goes from the source to the target, used by the canvas edge and the connection details.
    // A table counts for its database
    function getConnectionWarnings(sourceId: string, targetId: string): ConnectionWarning[] {
        const warnings: ConnectionWarning[] = [];
        const sourceName = resourceService.getResource(sourceId)?.name ?? 'the source';

        const missingPartWarning = getMissingPartWarning(sourceId, targetId);
        if (missingPartWarning) warnings.push(missingPartWarning);

        const isBetween = (relation: ResourceRelation) =>
            informationSourceService.getHolderIds(relation.sourceResourceId).includes(sourceId) &&
            informationSourceService.getHolderIds(relation.targetResourceId).includes(targetId);

        const unsentNames = getNames(unsentFieldRelations.value.filter(isBetween), unsentObjectRelations.value.filter(isBetween));
        if (unsentNames.length) {
            warnings.push({
                severity: 'warning',
                title: 'Sent through an API that does not send it',
                items: unsentNames,
                hint: `Add them to the API of ${sourceName}, or move them to another connection.`
            });
        }

        const throughUnknown = (relation: ResourceRelation) => isBetween(relation) && connectionStore.getConnection(relation.connectionId)?.kind === 'unknown';
        const unknownNames = getNames(
            informationRelationStore.fieldRelations.filter(throughUnknown),
            informationRelationStore.objectRelations.filter(throughUnknown)
        );
        if (unknownNames.length) {
            warnings.push({
                severity: 'warning',
                title: 'Not known yet how this gets there',
                items: unknownNames,
                hint: 'Find out how the information is transferred, and set the kind of the connection.'
            });
        }

        return warnings;
    }

    return { getUnsentInputFieldSource, getUnsentInputObjectSource, getConnectionWarnings };
}
