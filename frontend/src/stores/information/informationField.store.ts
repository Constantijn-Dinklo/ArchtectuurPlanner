import { defineStore } from "pinia";
import { ref } from "vue";

import api from "../../helpers/axios";
import type { InformationField, SourceMethod, SourceTarget } from "../../types/informationField.type";


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

    // All fields of the environment; the resources only bring in the fields they use
    async function fetchInformationFields() {
        const res = await api.get<InformationField[]>('/informationFields');
        setInformationFields(res.data);
    }

    // Sets the resource or file the field originates from; null removes the source
    async function setSource(id: string, target: SourceTarget | null) {
        const res = await api.patch<InformationField>(`/informationFields/${id}/source`, target ?? { resourceId: null });
        informationFields.value.set(id, res.data);
        return res.data;
    }

    // Sets how the field comes into being at its source; null removes the method
    async function setSourceMethod(id: string, sourceMethod: SourceMethod | null) {
        const res = await api.patch<InformationField>(`/informationFields/${id}/sourceMethod`, { sourceMethod });
        informationFields.value.set(id, res.data);
    }

    // What still uses the field: it can only be deleted when nothing does
    async function fetchUsage(id: string) {
        const res = await api.get<{ usage: string[] }>(`/informationFields/${id}/usage`);
        return res.data.usage;
    }

    async function deleteInformationField(id: string) {
        await api.delete(`/informationFields/${id}`);
        informationFields.value.delete(id);
    }

    return { informationFields, setInformationFields, getInformationField, fetchInformationFields, setSource, setSourceMethod, fetchUsage, deleteInformationField };

});