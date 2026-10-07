import { computed } from "vue";
import { useInformationRelationStore } from "../stores/information/informationRelation.store";
import { useEndpointInformationService } from "./endpointInformation.service";

// An output of a resource is a dead end when no relation carries it from that resource to another resource,
// and it is not used in one of the endpoints (dashboard, map, download, ...) of the resource.
// The relation application (input) -> application (output) does not count, since its target is the resource itself.
export function useInformationEndpointService() {
    const informationRelationStore = useInformationRelationStore();
    const endpointInformationService = useEndpointInformationService();

    const usedOutputFields = computed(() => new Set(
        informationRelationStore.fieldRelations
            .filter(relation => relation.sourceResourceId !== relation.targetResourceId)
            .map(relation => `${relation.sourceResourceId}:${relation.informationFieldId}`)
    ));

    const usedOutputObjects = computed(() => new Set(
        informationRelationStore.objectRelations
            .filter(relation => relation.sourceResourceId !== relation.targetResourceId)
            .map(relation => `${relation.sourceResourceId}:${relation.informationObjectId}`)
    ));

    function isUnusedOutputField(resourceId: string, informationFieldId: string) {
        return !usedOutputFields.value.has(`${resourceId}:${informationFieldId}`)
            && !endpointInformationService.isFieldInEndpoint(resourceId, informationFieldId);
    }

    function isUnusedOutputObject(resourceId: string, informationObjectId: string) {
        return !usedOutputObjects.value.has(`${resourceId}:${informationObjectId}`)
            && !endpointInformationService.isObjectInEndpoint(resourceId, informationObjectId);
    }

    return { isUnusedOutputField, isUnusedOutputObject };
}
