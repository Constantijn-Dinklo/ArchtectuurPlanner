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

    // All objects of the environment; the resources only bring in the objects they use
    async function fetchInformationObjects() {
        const res = await api.get<InformationObject[]>('/informationObjects');
        setInformationObjects(res.data);
    }

    // Sets the resource the object originates from; null removes the source
    async function setSource(id: string, resourceId: string | null) {
        const res = await api.patch<InformationObject>(`/informationObjects/${id}/source`, { resourceId });
        informationObjects.value.set(id, res.data);
    }


    // What still uses the object: it can only be deleted when nothing does
    async function fetchUsage(id: string) {
        const res = await api.get<{ usage: string[] }>(`/informationObjects/${id}/usage`);
        return res.data.usage;
    }

    async function deleteInformationObject(id: string) {
        await api.delete(`/informationObjects/${id}`);
        informationObjects.value.delete(id);
    }

    return { informationObjects, setInformationObjects, getInformationObject, fetchInformationObjects, setSource, fetchUsage, deleteInformationObject };

});