<script setup lang="ts">
    import { computed, ref, watch } from 'vue';
    import { Select } from 'primevue';
    import { useDataCatalogueService, type SourceOptionGroup } from '../../services/dataCatalogue.service';
    import { useInformationChainService, type InformationKind } from '../../services/informationChain.service';
    import { useInformationObjectService } from '../../services/informationObject.service';
    import { useInformationFieldStore } from '../../stores/information/informationField.store';
    import { useInformationObjectStore } from '../../stores/information/informationObject.store';
    import type { InformationFieldToAdd } from '../../types/connectionEnd.types';
    import { SOURCE_METHODS, type SourceMethod } from '../../types/informationField.type';
    import InformationEditor from '../details/InformationEditor.vue';
    import InformationChainView from '../InformationChainView.vue';

    // One piece of information. Its source and method can be seen and set on the row itself;
    // its chains and what uses it are only worked out when the card is opened
    const props = defineProps<{
        kind: InformationKind;
        informationId: string;
        name: string;
        sourceOptions: SourceOptionGroup[];
    }>();

    const dataCatalogueService = useDataCatalogueService();
    const informationChainService = useInformationChainService();
    const informationObjectService = useInformationObjectService();
    const informationFieldStore = useInformationFieldStore();
    const informationObjectStore = useInformationObjectStore();

    const expanded = ref(false);
    const chain = computed(() => informationChainService.getChain(props.kind, props.informationId));

    const information = computed(() => props.kind === 'field'
        ? informationFieldStore.getInformationField(props.informationId)
        : informationObjectStore.getInformationObject(props.informationId));

    // The objects a field is part of: as long as it is, the field cannot be deleted
    const containingObjectNames = computed(() => {
        if (props.kind !== 'field') return [];
        return [...informationObjectStore.informationObjects.values()]
            .filter(object => object.informationFieldIds.includes(props.informationId))
            .map(object => object.objectName)
            .sort((a, b) => a.localeCompare(b));
    });

    // Every field by name, so also the ones an object can get
    const fieldOptions = computed(() => [...informationFieldStore.informationFields.values()]
        .map(field => ({ id: field.id, label: field.fieldName }))
        .sort((a, b) => a.label.localeCompare(b.label)));

    // The fields that are part of an object
    const objectFieldIds = computed(() => {
        if (props.kind !== 'object') return [];
        const fieldIds = informationObjectStore.getInformationObject(props.informationId)?.informationFieldIds ?? [];
        return fieldOptions.value.map(option => option.id).filter(fieldId => fieldIds.includes(fieldId));
    });

    async function addObjectField(informationField: InformationFieldToAdd) {
        cardError.value = '';
        try {
            await informationObjectService.addInformationFieldToInformationObject(props.informationId, informationField);
        }
        catch (error: any) {
            cardError.value = error.response?.data?.error ?? `Could not add the field (${error.message})`;
        }
    }

    // Only takes the field out of this object; the field itself stays
    async function removeObjectField(informationFieldId: string) {
        cardError.value = '';
        try {
            await informationObjectService.deleteInformationFieldFromInformationObject(props.informationId, informationFieldId);
        }
        catch (error: any) {
            cardError.value = error.response?.data?.error ?? `Could not remove the field (${error.message})`;
        }
    }

    // What still uses the information; undefined until it is known. It can only be deleted when nothing does
    const usage = ref<string[]>();
    const cardError = ref('');

    // Choosing a source also adds the information to that place
    async function setSource(optionId: string | null) {
        const option = props.sourceOptions.flatMap(group => group.items).find(item => item.id === optionId);
        cardError.value = '';
        try {
            await dataCatalogueService.setSource(props.kind, props.informationId, option?.target ?? null);
        }
        catch (error: any) {
            cardError.value = error.response?.data?.error ?? `Could not save the source (${error.message})`;
        }
    }

    async function setSourceMethod(sourceMethod: SourceMethod | null) {
        cardError.value = '';
        try {
            if (props.kind === 'field') await informationFieldStore.setSourceMethod(props.informationId, sourceMethod);
            else await informationObjectStore.setSourceMethod(props.informationId, sourceMethod);
        }
        catch (error: any) {
            cardError.value = error.response?.data?.error ?? `Could not save the method (${error.message})`;
        }
    }

    async function toggle() {
        expanded.value = !expanded.value;
        if (expanded.value) await fetchUsage();
    }

    // A field that goes in or out of an object can change whether it can be deleted while the card is open
    watch(containingObjectNames, () => {
        if (expanded.value) fetchUsage();
    });

    async function fetchUsage() {
        usage.value = undefined;
        cardError.value = '';
        try {
            usage.value = props.kind === 'field'
                ? await informationFieldStore.fetchUsage(props.informationId)
                : await informationObjectStore.fetchUsage(props.informationId);
        }
        catch (error: any) {
            cardError.value = error.response?.data?.error ?? `Could not check what uses this (${error.message})`;
        }
    }

    // Deleting asks for a second click, so information is not removed by accident
    const isConfirmingDelete = ref(false);
    let confirmTimeout: ReturnType<typeof setTimeout> | undefined;

    async function onDeleteClick() {
        if (!isConfirmingDelete.value) {
            isConfirmingDelete.value = true;
            confirmTimeout = setTimeout(() => { isConfirmingDelete.value = false; }, 3000);
            return;
        }
        clearTimeout(confirmTimeout);
        isConfirmingDelete.value = false;

        try {
            if (props.kind === 'field') await informationFieldStore.deleteInformationField(props.informationId);
            else await informationObjectStore.deleteInformationObject(props.informationId);
        }
        catch (error: any) {
            cardError.value = error.response?.data?.error ?? `Could not delete this (${error.message})`;
        }
    }
</script>

<template>
    <article class="data-catalogue-card" :class="{ expanded }">
        <div class="card-header">
            <button type="button" class="card-toggle" :aria-expanded="expanded" @click="toggle">
                <i class="pi pi-chevron-right card-chevron" />
                <span class="card-icon" :class="kind" aria-hidden="true">{{ kind === 'object' ? '▱' : '' }}</span>
                <span class="card-name">{{ name }}</span>
                <span
                    v-for="objectName in containingObjectNames"
                    :key="objectName"
                    class="card-object"
                    :title="`Part of the information object ${objectName}`"
                >
                    ▱ {{ objectName }}
                </span>
            </button>

            <i
                v-if="information && !information.source"
                class="pi pi-exclamation-triangle source-warning"
                title="No source chosen"
            />
            <Select
                :model-value="information?.source?.componentId ?? information?.source?.resourceId ?? null"
                :options="sourceOptions"
                option-group-label="label"
                option-group-children="items"
                option-label="name"
                option-value="id"
                placeholder="Add source"
                filter
                show-clear
                size="small"
                class="source-select"
                aria-label="Source"
                @update:model-value="setSource"
            />
            <Select
                :model-value="information?.sourceMethod ?? null"
                :options="SOURCE_METHODS"
                option-label="label"
                option-value="method"
                placeholder="Add method"
                show-clear
                size="small"
                class="method-select"
                aria-label="Source method"
                @update:model-value="setSourceMethod"
            />
        </div>

        <div v-if="expanded && chain" class="card-content">
            <template v-if="kind === 'object'">
                <h3 class="content-title">
                    Fields
                    <span class="content-count">{{ objectFieldIds.length }}</span>
                </h3>
                <InformationEditor
                    :information-field-ids="objectFieldIds"
                    :information-object-ids="[]"
                    :field-options="fieldOptions"
                    empty-text="No fields yet"
                    allow-new
                    fields-only
                    @add-field="addObjectField"
                    @remove-field="removeObjectField"
                />

                <h3 class="content-title">Information chain</h3>
            </template>

            <InformationChainView :chain="chain" />

            <!-- Only offered when nothing uses the information -->
            <button
                v-if="usage && !usage.length"
                type="button"
                class="delete-button"
                :class="{ confirming: isConfirmingDelete }"
                @click="onDeleteClick"
            >
                <i class="pi pi-trash" />
                {{ isConfirmingDelete ? 'Click again to delete' : 'Delete' }}
            </button>
        </div>

        <div v-if="cardError" class="card-error">{{ cardError }}</div>
    </article>
</template>

<style scoped>
.data-catalogue-card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #ffffff;
}

.card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-right: 8px;
    border-radius: 8px;
}

.card-header:hover {
    background: #f8fafc;
}

.card-toggle {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 8px;

    min-width: 0;
    min-height: 40px;
    padding: 0 0 0 12px;

    border: 0;
    background: transparent;

    color: #1e293b;
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.source-warning {
    color: #d97706;
    font-size: 12px;
}

.source-select {
    flex: 0 0 200px;
    width: 200px;
}

.method-select {
    flex: 0 0 130px;
    width: 130px;
}

.card-chevron {
    color: #94a3b8;
    font-size: 9px;
    transition: transform 0.15s ease;
}

.expanded .card-chevron {
    transform: rotate(90deg);
}

.card-icon {
    display: inline-flex;
    flex: 0 0 12px;
    align-items: center;
    justify-content: center;
    color: #4f46e5;
}

/* The same dot as the fields in the inputs and outputs of a node */
.card-icon.field::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #94a3b8;
}

.card-name {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;

    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
}

/* The object a field is part of */
.card-object {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    padding: 0 7px;

    border: 1px dashed #a5b4fc;
    border-radius: 999px;
    background: #eef2ff;

    color: #4338ca;
    font-size: 11px;
    line-height: 18px;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.card-content {
    padding: 4px 12px 10px 22px;
    border-top: 1px solid #f1f5f9;
    color: var(--p-text-color);
}

.content-title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 8px 0 4px;

    color: #475569;
    font-size: 11px;
    font-weight: 600;
}

.content-count {
    padding: 0 6px;
    border-radius: 999px;

    background: #e2e8f0;
    color: #64748b;
    font-size: 10px;
    line-height: 16px;
}

.delete-button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 26px;
    margin-top: 8px;
    padding: 0 9px;

    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #ffffff;

    color: #64748b;
    font: inherit;
    font-size: 11px;
    cursor: pointer;
}

.delete-button:hover {
    border-color: #fecaca;
    background: #fef2f2;
    color: #dc2626;
}

.delete-button.confirming {
    border-color: #dc2626;
    background: #dc2626;
    color: #ffffff;
}

.card-error {
    padding: 0 12px 8px 22px;
    color: #b91c1c;
    font-size: 11px;
}
</style>
