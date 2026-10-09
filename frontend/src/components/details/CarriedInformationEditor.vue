<script setup lang="ts">
    import { computed } from 'vue';
    import { Select } from 'primevue';
    import { useSendableInformationService, type SendableField, type SendableObject } from '../../services/sendableInformation.service';

    // Edits which information a connection carries: chips for what is carried, pickers for what the source can pass on
    const props = defineProps<{
        sourceId: string;
        informationFieldIds: string[];
        informationObjectIds: string[];
    }>();

    const emit = defineEmits<{
        addField: [informationFieldId: string];
        removeField: [informationFieldId: string];
        addObject: [informationObjectId: string];
        removeObject: [informationObjectId: string];
    }>();

    const sendableInformationService = useSendableInformationService();

    const sendableFields = computed(() => sendableInformationService.getSendableFields(props.sourceId));
    const sendableObjects = computed(() => sendableInformationService.getSendableObjects(props.sourceId));

    // Only shows information the source can still pass on
    const carriedFields = computed(() => sendableFields.value.filter(field => props.informationFieldIds.includes(field.id)));
    const carriedObjects = computed(() => sendableObjects.value.filter(informationObject => props.informationObjectIds.includes(informationObject.id)));
</script>

<template>
    <div class="carried-information">
        <div
            v-if="carriedObjects.length || carriedFields.length"
            class="carried-chips"
        >
            <span
                v-for="informationObject in carriedObjects"
                :key="informationObject.id"
                class="carried-chip object"
            >
                ▱ {{ informationObject.objectName }}
                <button
                    type="button"
                    title="No longer sent"
                    @click="emit('removeObject', informationObject.id)"
                >
                    ×
                </button>
            </span>

            <span
                v-for="field in carriedFields"
                :key="field.id"
                class="carried-chip"
                :title="field.objectNames.length ? `Part of ${field.objectNames.join(', ')}` : undefined"
            >
                {{ field.fieldName }}
                <button
                    type="button"
                    title="No longer sent"
                    @click="emit('removeField', field.id)"
                >
                    ×
                </button>
            </span>
        </div>
        <div
            v-else
            class="carried-empty"
        >
            Nothing sent yet
        </div>

        <div class="carried-pickers">
            <Select
                v-if="sendableObjects.length"
                :model-value="undefined"
                :options="sendableObjects"
                option-label="objectName"
                :option-disabled="(informationObject: SendableObject) => informationObjectIds.includes(informationObject.id)"
                placeholder="+ Object"
                filter
                filter-placeholder="Search object"
                size="small"
                class="detail-prime-select carried-select"
                @change="event => event.value && emit('addObject', event.value.id)"
            />
            <Select
                :model-value="undefined"
                :options="sendableFields"
                option-label="label"
                :option-disabled="(field: SendableField) => informationFieldIds.includes(field.id)"
                placeholder="+ Field"
                filter
                filter-placeholder="Search field"
                empty-message="The source has no information to send"
                size="small"
                class="detail-prime-select carried-select"
                @change="event => event.value && emit('addField', event.value.id)"
            />
        </div>
    </div>
</template>

<style scoped>
.carried-information {
    padding: 2px 0 4px 22px;
}

.carried-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.carried-chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;

    padding: 1px 3px 1px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 999px;

    background: #ffffff;
    font-size: 11px;
}

.carried-chip.object {
    border-color: #c7d2fe;
    background: #eef2ff;
    color: #3730a3;
}

.carried-chip button {
    width: 16px;
    height: 16px;
    padding: 0;

    border: 0;
    border-radius: 50%;
    background: transparent;

    color: #94a3b8;
    cursor: pointer;
}

.carried-chip button:hover {
    background: #fee2e2;
    color: #dc2626;
}

.carried-empty {
    color: #94a3b8;
    font-size: 11px;
    font-style: italic;
}

.carried-pickers {
    display: flex;
    gap: 4px;
}

.carried-pickers :deep(.carried-select.p-select) {
    flex: 1;
    min-width: 0;
}
</style>
