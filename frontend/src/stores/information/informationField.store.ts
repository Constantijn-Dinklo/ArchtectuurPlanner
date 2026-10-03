import { defineStore } from "pinia";
import { ref } from "vue";

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


    return { informationFields, setInformationFields, getInformationField };

});