import { defineStore } from "pinia";
import { ref } from "vue";

export type EntityType = 'resource' | 'edge';

export const useUIStore = defineStore('UI', () => {
    const selectedEntityId = ref<string>('');
    const selectedEntityType = ref<EntityType>();
    
    function setSelectedEntity(id: string, type: EntityType) {
        selectedEntityId.value = id;
        selectedEntityType.value = type;
    }

    return { selectedEntityId, selectedEntityType, setSelectedEntity }
})