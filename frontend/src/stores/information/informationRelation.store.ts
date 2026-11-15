import { defineStore } from "pinia";
import { ref } from "vue";

import api from "../../helpers/axios";
import type { ResourceType } from "../../types/resource.type";
import { useApplicationService } from "../../services/resources/application.service";
import { useExternalService } from "../../services/resources/external.service";
import { useTableStore } from "../resources/table.store";

export interface ResourceRelation {
    id: string;
    sourceResourceId: string;
    sourceResourceType: ResourceType;
    targetResourceId: string;
    targetResourceType: ResourceType;

    // The connection the information travels through, chosen by the user when there is more than one
    viaConnectionType?: ConnectionType | null;
    viaConnectionId?: string | null;
}

// 'component' is a script inside an application or file location
export type ConnectionType = 'api' | 'database' | 'other' | 'component';

export interface ViaConnection {
    type: ConnectionType;
    id: string;
}

export interface ResourceFieldRelation extends ResourceRelation {
    informationFieldId: string;
}

export interface ResourceObjectRelation extends ResourceRelation {
    informationObjectId: string;
}

// Information that one resource receives from another, added by hand
export interface RelationToAdd {
    kind: 'field' | 'object';
    informationId: string;
    sourceResourceId: string;
    targetResourceId: string;
    via?: ViaConnection | null;
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

    async function setFieldRelationVia(relationId: string, via: ViaConnection | null) {
        const res = await api.patch<ResourceFieldRelation>(`/informationRelations/fields/${relationId}`, {
            viaConnectionType: via?.type ?? null,
            viaConnectionId: via?.id ?? null
        });
        const relation = fieldRelations.value.find(fieldRelation => fieldRelation.id === relationId);
        if(relation) Object.assign(relation, res.data);
    }

    async function setObjectRelationVia(relationId: string, via: ViaConnection | null) {
        const res = await api.patch<ResourceObjectRelation>(`/informationRelations/objects/${relationId}`, {
            viaConnectionType: via?.type ?? null,
            viaConnectionId: via?.id ?? null
        });
        const relation = objectRelations.value.find(objectRelation => objectRelation.id === relationId);
        if(relation) Object.assign(relation, res.data);
    }

    // Adding or removing a relation by hand also changes the receiver: the inputs of an application,
    // the columns of a table, what an external element receives
    async function refreshAfterChange() {
        await Promise.all([
            fetchInformationRelations(),
            useApplicationService().fetchApplications(),
            useTableStore().fetchTables(),
            useExternalService().fetchExternals()
        ]);
    }

    async function addRelation(relation: RelationToAdd) {
        await api.post('/informationRelations', {
            ...relation,
            viaConnectionType: relation.via?.type ?? null,
            viaConnectionId: relation.via?.id ?? null
        });
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

    return { fieldRelations, objectRelations, fetchInformationRelations, setFieldRelationVia, setObjectRelationVia, addRelation, removeRelations };
});
