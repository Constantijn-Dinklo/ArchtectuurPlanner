import { defineStore } from "pinia";
import { ref } from "vue";

import api from "../../helpers/axios";
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

    // Sets the resource the object originates from; null removes the source
    async function setSource(id: string, resourceId: string | null) {
        const res = await api.patch<InformationObject>(`/informationObjects/${id}/source`, { resourceId });
        informationObjects.value.set(id, res.data);
    }


    return { informationObjects, setInformationObjects, getInformationObject, setSource };

});