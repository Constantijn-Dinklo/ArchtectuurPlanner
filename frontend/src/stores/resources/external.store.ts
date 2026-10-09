import { defineStore } from "pinia";
import { ref } from "vue";
import type { External } from "../../types/external.types";

export const useExternalStore = defineStore('external', () => {
    const externals = ref<External[]>([]);

    function setExternals(data: External[]) {
        externals.value = data;
    }

    function setExternal(external: External) {
        const existing = externals.value.find(e => e.id === external.id);
        if(existing) {
            Object.assign(existing, external);
        } else {
            externals.value.push(external);
        }
    }

    function removeExternal(id: string) {
        externals.value = externals.value.filter(external => external.id !== id);
    }

    return { externals, setExternals, setExternal, removeExternal };
});
