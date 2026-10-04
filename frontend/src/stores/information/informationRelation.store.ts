import { defineStore } from "pinia";
import { ref } from "vue";

import api from "../../helpers/axios";
import type { ResourceType } from "../../types/resource.type";

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

export type ConnectionType = 'api' | 'script' | 'database' | 'human';

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

    return { fieldRelations, objectRelations, fetchInformationRelations, setFieldRelationVia, setObjectRelationVia };
});
