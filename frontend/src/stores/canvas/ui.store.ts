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

    // The components (rows inside an application or file location) that are opened on the canvas
    const expandedComponentIds = ref<Set<string>>(new Set());

    function setLevelOfDetail(LoD: LevelOfDetail){
        levelOfDetail.value = LoD;
    }

    function setSelectedEntity(id: string, type: EntityType) {
        selectedEntityId.value = id;
        selectedEntityType.value = type;
    }

    function toggleComponentExpanded(componentId: string) {
        const expanded = new Set(expandedComponentIds.value);
        if (expanded.has(componentId)) {
            expanded.delete(componentId);
        } else {
            expanded.add(componentId);
        }
        expandedComponentIds.value = expanded;
    }

    return { levelOfDetail, selectedEntityId, selectedEntityType, informationFieldSearch, informationObjectSearch, editingTableId, expandedComponentIds, setSelectedEntity, setLevelOfDetail, toggleComponentExpanded }
})