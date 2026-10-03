import { defineStore } from "pinia";
import { ref } from "vue";
import type { LevelOfDetail } from "../../types/levelOfDetail";

export type EntityType = 'node' | 'edge';

export const useUIStore = defineStore('UI', () => {
    const levelOfDetail = ref<LevelOfDetail>('application');

    const selectedEntityId = ref<string>('');
    const selectedEntityType = ref<EntityType>();

    const informationFieldSearch = ref('');
    const informationObjectSearch = ref('');

    // The table whose name is being edited on the canvas
    const editingTableId = ref<string>();

    function setLevelOfDetail(LoD: LevelOfDetail){
        levelOfDetail.value = LoD;
    }
    
    function setSelectedEntity(id: string, type: EntityType) {
        selectedEntityId.value = id;
        selectedEntityType.value = type;
    }

    return { levelOfDetail, selectedEntityId, selectedEntityType, informationFieldSearch, informationObjectSearch, editingTableId, setSelectedEntity, setLevelOfDetail }
})