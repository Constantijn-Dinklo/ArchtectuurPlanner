import { defineStore } from "pinia";
import { ref } from "vue";

import type { InformationObject } from "../../types/informationObject.type";


export const useInformationObjectStore = defineStore('informationObject', () => {
    const informationObjects = ref<Map<string, InformationObject>>(new Map());

    function setInformationObjects(objects: InformationObject[]) {
        objects.forEach(object => {
            informationObjects.value.set(object.id, object);
        });
    }

    function getInformationObject(id: string) {
        return informationObjects.value.get(id);
    }


    return { informationObjects, setInformationObjects, getInformationObject };

});