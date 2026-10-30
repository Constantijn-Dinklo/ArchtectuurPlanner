import { computed } from "vue";
import { useInformationRelationStore } from "../stores/information/informationRelation.store";
import { useEndpointInformationService } from "./endpointInformation.service";
import { useComponentStore } from "../stores/resources/component.store";

// An output of a resource is a dead end when no relation carries it from that resource to another resource,
// and it is not used in one of the endpoints (dashboard, map, download, ...) of the resource.
// The relation application (input) -> application (output) does not count, since its target is the resource itself.
// A script that reads it from the resource uses it as well: relations only go between resources, so a read is not one
export function useInformationEndpointService() {
    const informationRelationStore = useInformationRelationStore();
    const endpointInformationService = useEndpointInformationService();
    const componentStore = useComponentStore();

    const scriptReads = computed(() => componentStore.components
        .filter(component => component.kind === 'script')
        .flatMap(script => script.inputs.filter(end => !end.componentId))
    );

    const usedOutputFields = computed(() => new Set([
        ...informationRelationStore.fieldRelations
            .filter(relation => relation.sourceResourceId !== relation.targetResourceId)
            .map(relation => `${relation.sourceResourceId}:${relation.informationFieldId}`),
        ...scriptReads.value.flatMap(end => end.informationFieldIds.map(fieldId => `${end.resourceId}:${fieldId}`))
    ]));

    const usedOutputObjects = computed(() => new Set([
        ...informationRelationStore.objectRelations
            .filter(relation => relation.sourceResourceId !== relation.targetResourceId)
            .map(relation => `${relation.sourceResourceId}:${relation.informationObjectId}`),
        ...scriptReads.value.flatMap(end => end.informationObjectIds.map(objectId => `${end.resourceId}:${objectId}`))
    ]));

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
