import { computed } from "vue";
import { useInformationRelationStore } from "../stores/information/informationRelation.store";
import { useInformationObjectStore } from "../stores/information/informationObject.store";
import { useInformationFieldStore } from "../stores/information/informationField.store";
import { useApiConnectionStore } from "../stores/apiConnection.store";
import { useApiStore, type Api } from "../stores/api.store";

export interface TransferWarnings {
    // Names of the information that goes from the source to the target application without an api url sending it
    fieldNames: string[];
    objectNames: string[];
}

// Information that is sent from one application to another has to be sent through an api url:
// an api connection from the source to the target, whose url sends the field or object.
// A field also counts as sent when the url sends an object the field is part of.
export function useInformationTransferService() {
    const informationRelationStore = useInformationRelationStore();
    const informationObjectStore = useInformationObjectStore();
    const informationFieldStore = useInformationFieldStore();
    const apiConnectionStore = useApiConnectionStore();
    const apiStore = useApiStore();

    function getUrlsBetween(sourceId: string, targetId: string): Api[] {
        return apiConnectionStore.apiConnections
            .filter(connection => connection.sourceId === sourceId && connection.targetId === targetId)
            .map(connection => apiStore.getApi(connection.sourceUrlId))
            .filter(url => url !== undefined);
    }

    function urlSendsField(url: Api, informationFieldId: string) {
        if (url.informationFieldIds?.includes(informationFieldId)) return true;

        return (url.informationObjectIds ?? []).some(objectId =>
            informationObjectStore.getInformationObject(objectId)?.informationFieldIds.includes(informationFieldId)
        );
    }

    function isBetweenApplications(relation: { sourceResourceId: string, sourceResourceType: string, targetResourceId: string, targetResourceType: string }) {
        return relation.sourceResourceType === 'application'
            && relation.targetResourceType === 'application'
            && relation.sourceResourceId !== relation.targetResourceId;
    }

    const unsentFieldRelations = computed(() =>
        informationRelationStore.fieldRelations
            .filter(isBetweenApplications)
            .filter(relation => !getUrlsBetween(relation.sourceResourceId, relation.targetResourceId)
                .some(url => urlSendsField(url, relation.informationFieldId)))
    );

    const unsentObjectRelations = computed(() =>
        informationRelationStore.objectRelations
            .filter(isBetweenApplications)
            .filter(relation => !getUrlsBetween(relation.sourceResourceId, relation.targetResourceId)
                .some(url => url.informationObjectIds?.includes(relation.informationObjectId)))
    );

    // Keyed by `${targetApplicationId}:${informationId}`, the value is the id of the application it comes from
    const unsentInputFields = computed(() => new Map(
        unsentFieldRelations.value.map(relation => [`${relation.targetResourceId}:${relation.informationFieldId}`, relation.sourceResourceId])
    ));

    const unsentInputObjects = computed(() => new Map(
        unsentObjectRelations.value.map(relation => [`${relation.targetResourceId}:${relation.informationObjectId}`, relation.sourceResourceId])
    ));

    // Keyed by `${sourceApplicationId}->${targetApplicationId}`
    const transferWarnings = computed(() => {
        const warnings = new Map<string, TransferWarnings>();

        function getWarnings(sourceId: string, targetId: string) {
            const key = `${sourceId}->${targetId}`;
            const existing = warnings.get(key) ?? { fieldNames: [], objectNames: [] };
            warnings.set(key, existing);
            return existing;
        }

        for (const relation of unsentFieldRelations.value) {
            getWarnings(relation.sourceResourceId, relation.targetResourceId).fieldNames.push(
                informationFieldStore.getInformationField(relation.informationFieldId)?.fieldName ?? 'Unknown field'
            );
        }
        for (const relation of unsentObjectRelations.value) {
            getWarnings(relation.sourceResourceId, relation.targetResourceId).objectNames.push(
                informationObjectStore.getInformationObject(relation.informationObjectId)?.objectName ?? 'Unknown object'
            );
        }

        return warnings;
    });

    // Returns the id of the application the input field comes from without being sent through an api url
    function getUnsentInputFieldSource(applicationId: string, informationFieldId: string) {
        return unsentInputFields.value.get(`${applicationId}:${informationFieldId}`);
    }

    function getUnsentInputObjectSource(applicationId: string, informationObjectId: string) {
        return unsentInputObjects.value.get(`${applicationId}:${informationObjectId}`);
    }

    function getTransferWarnings(sourceId: string, targetId: string): TransferWarnings | undefined {
        return transferWarnings.value.get(`${sourceId}->${targetId}`);
    }

    return { getUnsentInputFieldSource, getUnsentInputObjectSource, getTransferWarnings };
}
