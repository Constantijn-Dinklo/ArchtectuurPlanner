<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { Select } from 'primevue';
    import { useInformationFieldStore } from '../../stores/information/informationField.store';
    import { useInformationObjectStore } from '../../stores/information/informationObject.store';
    import type { InformationFieldToAdd, InformationObjectToAdd, InformationOption } from '../../types/connectionEnd.types';

    // Edits a list of information: chips for what is in it, pickers for what can be added,
    // and optionally inputs to make new information. What can be added and where it is saved is up to the parent
    const props = withDefaults(defineProps<{
        informationFieldIds: string[];
        informationObjectIds: string[];
        fieldOptions?: InformationOption[];
        objectOptions?: InformationOption[];
        emptyText: string;
        fieldOptionsEmpty?: string;
        objectOptionsEmpty?: string;
        allowNew?: boolean;
        // Only the chips, without a way to add more
        chipsOnly?: boolean;
    }>(), {
        fieldOptions: () => [],
        objectOptions: () => [],
        fieldOptionsEmpty: 'No fields available',
        objectOptionsEmpty: 'No objects available',
        allowNew: false,
        chipsOnly: false
    });

    const emit = defineEmits<{
        addField: [information: InformationFieldToAdd];
        removeField: [informationFieldId: string];
        addObject: [information: InformationObjectToAdd];
        removeObject: [informationObjectId: string];
    }>();

    const informationFieldStore = useInformationFieldStore();
    const informationObjectStore = useInformationObjectStore();

    const fields = computed(() => props.informationFieldIds
        .map(fieldId => informationFieldStore.getInformationField(fieldId))
        .filter(field => field !== undefined)
    );

    const objects = computed(() => props.informationObjectIds
        .map(objectId => informationObjectStore.getInformationObject(objectId))
        .filter(informationObject => informationObject !== undefined)
    );

    const newFieldName = ref('');
    const newObjectName = ref('');

    function addNewField() {
        const fieldName = newFieldName.value.trim();
        if (!fieldName) return;
        emit('addField', { fieldName });
        newFieldName.value = '';
    }

    function addNewObject() {
        const objectName = newObjectName.value.trim();
        if (!objectName) return;
        emit('addObject', { objectName });
        newObjectName.value = '';
    }
</script>

<template>
    <div v-if="!objects.length && !fields.length" class="detail-empty">
        {{ emptyText }}
    </div>

    <div class="information-chips">
        <span v-for="informationObject in objects" :key="informationObject.id" class="information-chip object">
            ▱ {{ informationObject.objectName }}
            <button type="button" title="Remove" @click="emit('removeObject', informationObject.id)">×</button>
        </span>
        <span v-for="field in fields" :key="field.id" class="information-chip">
            {{ field.fieldName }}
            <button type="button" title="Remove" @click="emit('removeField', field.id)">×</button>
        </span>
    </div>

    <template v-if="!chipsOnly">
        <div class="information-pickers">
            <Select
                :model-value="undefined"
                :options="objectOptions"
                option-label="label"
                :option-disabled="(option: InformationOption) => informationObjectIds.includes(option.id)"
                placeholder="+ Object"
                filter
                filter-placeholder="Search object"
                :empty-message="objectOptionsEmpty"
                size="small"
                class="detail-prime-select"
                @change="event => event.value && emit('addObject', { informationObjectId: event.value.id })"
            />
            <Select
                :model-value="undefined"
                :options="fieldOptions"
                option-label="label"
                :option-disabled="(option: InformationOption) => informationFieldIds.includes(option.id)"
                placeholder="+ Field"
                filter
                filter-placeholder="Search field"
                :empty-message="fieldOptionsEmpty"
                size="small"
                class="detail-prime-select"
                @change="event => event.value && emit('addField', { informationFieldId: event.value.id })"
            />
        </div>

        <template v-if="allowNew">
            <div class="detail-add-row">
                <input
                    v-model="newObjectName"
                    type="text"
                    class="detail-input"
                    placeholder="+ New information object"
                    @keyup.enter="addNewObject"
                />
                <button type="button" class="detail-add-button" :disabled="!newObjectName.trim()" @click="addNewObject">
                    <i class="pi pi-plus" />
                </button>
            </div>
            <div class="detail-add-row">
                <input
                    v-model="newFieldName"
                    type="text"
                    class="detail-input"
                    placeholder="+ New information field"
                    @keyup.enter="addNewField"
                />
                <button type="button" class="detail-add-button" :disabled="!newFieldName.trim()" @click="addNewField">
                    <i class="pi pi-plus" />
                </button>
            </div>
        </template>
    </template>
</template>

<style scoped>
.information-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.information-chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 1px 3px 1px 8px;

    border: 1px solid #e2e8f0;
    border-radius: 999px;
    background: #ffffff;
    font-size: 11px;
}

.information-chip.object {
    border-color: #c7d2fe;
    background: #eef2ff;
    color: #3730a3;
}

.information-chip button {
    width: 16px;
    height: 16px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
}

.information-chip button:hover {
    background: #fee2e2;
    color: #dc2626;
}

.information-pickers {
    display: flex;
    gap: 4px;
}

.information-pickers :deep(.detail-prime-select.p-select) {
    flex: 1;
    min-width: 0;
}
</style>
