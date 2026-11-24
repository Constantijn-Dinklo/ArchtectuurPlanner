import { computed } from "vue";
import { useInformationRelationStore, type ResourceRelation } from "../stores/information/informationRelation.store";
import { useInformationObjectStore } from "../stores/information/informationObject.store";
import { useInformationFieldStore } from "../stores/information/informationField.store";
import { useApiStore } from "../stores/api.store";
import { useConnectionStore } from "../stores/connection.store";
import { usePartService } from "./part.service";
import { useCanvasEndService } from "./canvasEnd.service";

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
    const partService = usePartService();
    const { getVisibleEndId } = useCanvasEndService();

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

    // All warnings for what goes along one arrow, from the source to the target, used by the canvas edge and the
    // connection details
    function getConnectionWarnings(sourceId: string, targetId: string): ConnectionWarning[] {
        const warnings: ConnectionWarning[] = [];
        const sourceName = partService.getPart(sourceId)?.name ?? 'the source';

        // The relations drawn on this arrow: their ends are drawn at its ends, by the same rule as the arrow itself
        // (a script at its application while scripts are hidden, a file at its file location while files are hidden)
        const isBetween = (relation: ResourceRelation) =>
            getVisibleEndId(relation.sourceResourceId) === sourceId &&
            getVisibleEndId(relation.targetResourceId) === targetId;

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
