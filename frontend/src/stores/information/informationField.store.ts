import { defineStore } from "pinia";
import { ref } from "vue";

import api from "../../helpers/axios";
import type { InformationField } from "../../types/informationField.type";


export const useInformationFieldStore = defineStore('informationField', () => {
    const informationFields = ref<Map<string, InformationField>>(new Map());

    function setInformationFields(fields: InformationField[]) {
        fields.forEach(field => {
            informationFields.value.set(field.id, field);
        });
    }

    function getInformationField(id: string) {
        return informationFields.value.get(id);
    }

    // Sets the resource the field originates from; null removes the source
    async function setSource(id: string, resourceId: string | null) {
        const res = await api.patch<InformationField>(`/informationFields/${id}/source`, { resourceId });
        informationFields.value.set(id, res.data);
    }


    return { informationFields, setInformationFields, getInformationField, setSource };

});