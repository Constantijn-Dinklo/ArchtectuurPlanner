import { computed } from "vue";
import { useInformationRelationStore } from "../stores/information/informationRelation.store";
import { useInformationObjectStore } from "../stores/information/informationObject.store";
import { useInformationFieldStore } from "../stores/information/informationField.store";
import { useApiConnectionStore } from "../stores/apiConnection.store";
import { useApiStore, type Api } from "../stores/api.store";
import { useOtherConnectionStore } from "../stores/otherConnection.store";
import { useResourceService } from "./resources/resource.service";
import { useScriptStore } from "../stores/script.store";
import { useDatabaseConnectionStore } from "../stores/databaseConnection.store";

// A problem with the information transfer between two resources, with what to do about it.
// error: information moves between the resources without any connection at all
// warning: there is a connection, but something about it is incomplete
export interface ConnectionWarning {
    severity: 'error' | 'warning';
    title: string;
    // The information or connections the warning is about
    items: string[];
    hint: string;
}

export interface TransferWarnings {
    // Names of the information that goes from the source to the target application without an api url or other connection carrying it
    fieldNames: string[];
    objectNames: string[];
}

// Information that is sent from one application to another has to be sent through an api url
// (an api connection from the source to the target, whose url sends the field or object),
// or carried over by an other connection (by hand, a send button, a file, ...) from the source to the target.
// A field also counts as sent when an object the field is part of is sent.
export function useInformationTransferService() {
    const informationRelationStore = useInformationRelationStore();
    const informationObjectStore = useInformationObjectStore();
    const informationFieldStore = useInformationFieldStore();
    const apiConnectionStore = useApiConnectionStore();
    const apiStore = useApiStore();
    const otherConnectionStore = useOtherConnectionStore();
    const resourceService = useResourceService();
    const scriptStore = useScriptStore();
    const databaseConnectionStore = useDatabaseConnectionStore();

    // Whether there is any kind of connection from the source to the target
    function hasAnyConnection(sourceId: string, targetId: string) {
        return apiConnectionStore.apiConnections.some(connection => connection.sourceId === sourceId && connection.targetId === targetId)
            || otherConnectionStore.otherConnections.some(connection => connection.sourceId === sourceId && connection.targetId === targetId)
            || scriptStore.scripts.some(script => script.inputIds.includes(sourceId) && script.outputIds.includes(targetId))
            || databaseConnectionStore.databaseConnections.some(connection =>
                (connection.operation.includes('read') && connection.databaseId === sourceId && connection.entityId === targetId) ||
                (connection.operation.includes('write') && connection.entityId === sourceId && connection.databaseId === targetId)
            );
    }

    function getUrlsBetween(sourceId: string, targetId: string): Api[] {
        return apiConnectionStore.apiConnections
            .filter(connection => connection.sourceId === sourceId && connection.targetId === targetId)
            .map(connection => apiStore.getApi(connection.sourceUrlId))
            .filter(url => url !== undefined);
    }

    // Api urls and other connections both carry a list of fields and objects
    function getCarriersBetween(sourceId: string, targetId: string): Pick<Api, 'informationFieldIds' | 'informationObjectIds'>[] {
        const otherConnections = otherConnectionStore.otherConnections
            .filter(connection => connection.sourceId === sourceId && connection.targetId === targetId);
        return [...getUrlsBetween(sourceId, targetId), ...otherConnections];
    }

    function carriesField(carrier: Pick<Api, 'informationFieldIds' | 'informationObjectIds'>, informationFieldId: string) {
        if (carrier.informationFieldIds?.includes(informationFieldId)) return true;

        return (carrier.informationObjectIds ?? []).some(objectId =>
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
            .filter(relation => !getCarriersBetween(relation.sourceResourceId, relation.targetResourceId)
                .some(carrier => carriesField(carrier, relation.informationFieldId)))
    );

    const unsentObjectRelations = computed(() =>
        informationRelationStore.objectRelations
            .filter(isBetweenApplications)
            .filter(relation => !getCarriersBetween(relation.sourceResourceId, relation.targetResourceId)
                .some(carrier => carrier.informationObjectIds?.includes(relation.informationObjectId)))
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

    // All warnings for the connection from the source to the target, used by the canvas edge and the connection details
    function getConnectionWarnings(sourceId: string, targetId: string): ConnectionWarning[] {
        const warnings: ConnectionWarning[] = [];
        const sourceName = resourceService.getResource(sourceId)?.name ?? 'the source';
        const targetName = resourceService.getResource(targetId)?.name ?? 'the target';

        const connectionsWithoutUrl = apiConnectionStore.apiConnections.filter(connection =>
            connection.sourceId === sourceId && connection.targetId === targetId && !connection.sourceUrlId
        );
        if (connectionsWithoutUrl.length) {
            warnings.push({
                severity: 'warning',
                title: connectionsWithoutUrl.length === 1
                    ? 'An API connection has no url'
                    : `${connectionsWithoutUrl.length} API connections have no url`,
                items: connectionsWithoutUrl.map(connection => `API connection …${connection.id.slice(-6)}`),
                hint: `Select the url of ${sourceName} in the Api tab of the connections table, otherwise no information can be transferred.`
            });
        }

        const transferWarnings = getTransferWarnings(sourceId, targetId);

        // Information moves while there is no connection at all: that is an error, not just something incomplete
        if (transferWarnings && !hasAnyConnection(sourceId, targetId)) {
            warnings.push({
                severity: 'error',
                title: 'Information is moved without any connection',
                items: [
                    ...transferWarnings.objectNames.map(objectName => `▱ ${objectName}`),
                    ...transferWarnings.fieldNames
                ],
                hint: `Add a connection from ${sourceName} to ${targetName} (an API, script, database or other connection) that carries this information.`
            });
            return warnings;
        }

        const fixHint = `Add them to an API url of ${sourceName} that is connected to ${targetName}, or to an other connection (Other tab) from ${sourceName} to ${targetName}.`;

        if (transferWarnings?.objectNames.length) {
            warnings.push({
                severity: 'warning',
                title: 'Objects sent without an API url or other connection',
                items: transferWarnings.objectNames,
                hint: fixHint
            });
        }
        if (transferWarnings?.fieldNames.length) {
            warnings.push({
                severity: 'warning',
                title: 'Fields sent without an API url or other connection',
                items: transferWarnings.fieldNames,
                hint: fixHint
            });
        }

        return warnings;
    }

    return { getUnsentInputFieldSource, getUnsentInputObjectSource, getTransferWarnings, getConnectionWarnings };
}
