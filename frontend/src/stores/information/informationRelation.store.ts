import { defineStore } from "pinia";
import { ref } from "vue";

import api from "../../helpers/axios";
import type { ResourceType } from "../../types/resource.type";
import { useConnectionStore } from "../connection.store";
import { useTableStore } from "../resources/table.store";
import { useApplicationService } from "../../services/resources/application.service";
import { useExternalService } from "../../services/resources/external.service";

// One piece of information moving from a source to a target, through one connection. Only a relation inside one
// resource (from its input to its output) has no connection
export interface ResourceRelation {
    id: string;
    sourceResourceId: string;
    sourceResourceType: ResourceType;
    targetResourceId: string;
    targetResourceType: ResourceType;

    connectionId: string | null;
    // Until scripts are connection ends themselves: the script the information goes through instead of a connection
    scriptId: string | null;
}

export interface ResourceFieldRelation extends ResourceRelation {
    informationFieldId: string;
}

export interface ResourceObjectRelation extends ResourceRelation {
    informationObjectId: string;
}

export interface RelationToAdd {
    kind: 'field' | 'object';
    informationId: string;
    sourceResourceId: string;
    targetResourceId: string;
    connectionId?: string | null;
}

interface GetInformationRelationsResponse {
    fieldRelations: ResourceFieldRelation[];
    objectRelations: ResourceObjectRelation[];
}

export const useInformationRelationStore = defineStore('informationRelation', () => {
    const fieldRelations = ref<ResourceFieldRelation[]>([]);
    const objectRelations = ref<ResourceObjectRelation[]>([]);

    async function fetchInformationRelations() {
        const res = await api.get<GetInformationRelationsResponse>('/informationRelations');
        fieldRelations.value = res.data.fieldRelations;
        objectRelations.value = res.data.objectRelations;
    }

    // Moves the relation to another connection between the same two resources
    async function setRelationConnection(kind: 'field' | 'object', relationId: string, connectionId: string) {
        const res = await api.patch<ResourceRelation>(`/informationRelations/${kind === 'field' ? 'fields' : 'objects'}/${relationId}`, { connectionId });
        const relations: ResourceRelation[] = kind === 'field' ? fieldRelations.value : objectRelations.value;
        const relation = relations.find(existing => existing.id === relationId);
        if(relation) Object.assign(relation, res.data);
    }

    // Adding or removing a relation by hand also changes the receiver (the inputs of an application, the columns of
    // a table, what an external element receives) and can make a connection
    async function refreshAfterChange() {
        await Promise.all([
            fetchInformationRelations(),
            useConnectionStore().fetchConnections(),
            useApplicationService().fetchApplications(),
            useTableStore().fetchTables(),
            useExternalService().fetchExternals()
        ]);
    }

    // Information one resource receives from another. Without a connection it goes through one between the two
    async function addRelation(relation: RelationToAdd) {
        await api.post('/informationRelations', relation);
        await refreshAfterChange();
    }

    async function removeRelations(relations: { kind: 'field' | 'object', id: string }[]) {
        try {
            for (const relation of relations) {
                await api.delete(`/informationRelations/${relation.kind === 'field' ? 'fields' : 'objects'}/${relation.id}`);
            }
        }
        finally {
            await refreshAfterChange();
        }
    }

    return { fieldRelations, objectRelations, fetchInformationRelations, setRelationConnection, addRelation, removeRelations };
});
