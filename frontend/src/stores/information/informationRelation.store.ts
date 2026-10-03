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

    return { fieldRelations, objectRelations, fetchInformationRelations };
});
