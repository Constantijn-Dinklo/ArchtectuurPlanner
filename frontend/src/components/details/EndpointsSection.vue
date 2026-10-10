<script setup lang="ts">
    import { vCollapsible } from '../../directives/collapsible';
    import { computed, ref } from 'vue';
    import { Select } from 'primevue';
    import {
        useEndpointStore,
        ENDPOINT_TYPES,
        getEndpointTypeInfo,
        type Endpoint,
        type EndpointType
    } from '../../stores/endpoint.store';
    import { useEndpointInformationService, type HeldField, type HeldObject } from '../../services/endpointInformation.service';
    import type { ResourceType } from '../../types/resource.type';

    // The endpoints of a resource: places where its information is used by people (dashboards, maps, downloads, ...)
    const props = defineProps<{
        resourceId: string;
        resourceType: ResourceType;
    }>();

    const endpointStore = useEndpointStore();
    const endpointInformationService = useEndpointInformationService();

    const newEndpointName = ref('');
    const newEndpointType = ref<EndpointType>('dashboard');

    const editingEndpointId = ref<string>();
    const editedName = ref('');

    const endpoints = computed(() => endpointStore.getResourceEndpoints(props.resourceId));
    const heldFields = computed(() => endpointInformationService.getHeldFields(props.resourceId));
    const heldObjects = computed(() => endpointInformationService.getHeldObjects(props.resourceId));

    // Only shows information the resource still holds
    function getEndpointFields(endpoint: Endpoint) {
        return heldFields.value.filter(field => endpoint.informationFieldIds.includes(field.id));
    }

    function getEndpointObjects(endpoint: Endpoint) {
        return heldObjects.value.filter(informationObject => endpoint.informationObjectIds.includes(informationObject.id));
    }

    async function addEndpoint() {
        const name = newEndpointName.value.trim();
        if (!name) return;
        await endpointStore.createEndpoint(props.resourceId, props.resourceType, name, newEndpointType.value);
        newEndpointName.value = '';
    }

    function startRename(endpoint: Endpoint) {
        editingEndpointId.value = endpoint.id;
        editedName.value = endpoint.name;
    }

    function saveRename(endpoint: Endpoint) {
        if (editingEndpointId.value !== endpoint.id) return;
        const name = editedName.value.trim();
        if (name && name !== endpoint.name) {
            endpointStore.updateEndpoint(endpoint.id, { name });
        }
        editingEndpointId.value = undefined;
    }

    // Focuses the rename input as soon as it appears
    const vFocus = { mounted: (el: HTMLInputElement) => { el.focus(); el.select(); } };
</script>

<template>
    <section v-collapsible class="detail-section">
        <div class="detail-section-title">
            <span>Endpoints</span>
            <span class="detail-count">{{ endpoints.length }}</span>
        </div>

        <div
            v-if="!endpoints.length"
            class="detail-empty"
        >
            No endpoints. Add one where information is used, like a dashboard, map or download.
        </div>

        <div
            v-for="endpoint in endpoints"
            :key="endpoint.id"
            class="endpoint-card"
        >
            <div class="endpoint-header">
                <span class="endpoint-icon">
                    <i :class="getEndpointTypeInfo(endpoint.type).icon" />
                </span>

                <input
                    v-if="editingEndpointId === endpoint.id"
                    v-model="editedName"
                    v-focus
                    class="detail-input endpoint-name-input"
                    @keydown.enter.prevent="saveRename(endpoint)"
                    @keydown.esc.prevent="editingEndpointId = undefined"
                    @blur="saveRename(endpoint)"
                />
                <span
                    v-else
                    class="endpoint-name"
                    title="Double click to rename"
                    @dblclick="startRename(endpoint)"
                >
                    {{ endpoint.name }}
                </span>

                <select
                    class="endpoint-type-select"
                    :value="endpoint.type"
                    title="Type of endpoint"
                    @change="endpointStore.updateEndpoint(endpoint.id, { type: ($event.target as HTMLSelectElement).value as EndpointType })"
                >
                    <option
                        v-for="endpointType in ENDPOINT_TYPES"
                        :key="endpointType.type"
                        :value="endpointType.type"
                    >
                        {{ endpointType.label }}
                    </option>
                </select>

                <button
                    type="button"
                    class="detail-delete-button endpoint-delete"
                    title="Delete endpoint"
                    @click="endpointStore.deleteEndpoint(endpoint.id)"
                >
                    ×
                </button>
            </div>

            <div
                v-if="!getEndpointObjects(endpoint).length && !getEndpointFields(endpoint).length"
                class="detail-empty"
            >
                No information used here yet
            </div>

            <div class="endpoint-chips">
                <span
                    v-for="informationObject in getEndpointObjects(endpoint)"
                    :key="informationObject.id"
                    class="endpoint-chip object"
                >
                    ▱ {{ informationObject.objectName }}
                    <button
                        type="button"
                        title="Remove from this endpoint"
                        @click="endpointStore.removeInformationObject(endpoint.id, informationObject.id)"
                    >
                        ×
                    </button>
                </span>

                <span
                    v-for="field in getEndpointFields(endpoint)"
                    :key="field.id"
                    class="endpoint-chip"
                    :title="field.objectNames.length ? `Part of ${field.objectNames.join(', ')}` : undefined"
                >
                    {{ field.fieldName }}
                    <button
                        type="button"
                        title="Remove from this endpoint"
                        @click="endpointStore.removeInformationField(endpoint.id, field.id)"
                    >
                        ×
                    </button>
                </span>
            </div>

            <Select
                v-if="heldObjects.length"
                :model-value="undefined"
                :options="heldObjects"
                option-label="objectName"
                :option-disabled="(informationObject: HeldObject) => endpoint.informationObjectIds.includes(informationObject.id)"
                placeholder="+ Add object"
                filter
                filter-placeholder="Search object"
                size="small"
                class="detail-prime-select"
                @change="event => event.value && endpointStore.addInformationObject(endpoint.id, event.value.id)"
            />
            <Select
                :model-value="undefined"
                :options="heldFields"
                option-label="label"
                :option-disabled="(field: HeldField) => endpoint.informationFieldIds.includes(field.id)"
                placeholder="+ Add field"
                filter
                filter-placeholder="Search field"
                empty-message="This resource holds no information yet"
                size="small"
                class="detail-prime-select"
                @change="event => event.value && endpointStore.addInformationField(endpoint.id, event.value.id)"
            />
        </div>

        <div class="detail-add-row">
            <input
                v-model="newEndpointName"
                type="text"
                class="detail-input"
                placeholder="+ New endpoint, e.g. Sales dashboard"
                @keyup.enter="addEndpoint"
            />
            <select
                v-model="newEndpointType"
                class="endpoint-type-select new"
                title="Type of endpoint"
            >
                <option
                    v-for="endpointType in ENDPOINT_TYPES"
                    :key="endpointType.type"
                    :value="endpointType.type"
                >
                    {{ endpointType.label }}
                </option>
            </select>
            <button
                type="button"
                class="detail-add-button"
                title="Add endpoint"
                :disabled="!newEndpointName.trim()"
                @click="addEndpoint"
            >
                <i class="pi pi-plus" />
            </button>
        </div>
    </section>
</template>

<style scoped>
.endpoint-card {
    margin: 6px 0 8px;
    padding: 8px;

    border: 1px solid #ddd6fe;
    border-radius: 8px;
    background: #faf5ff;
}

.endpoint-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
}

.endpoint-icon {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;

    width: 22px;
    height: 22px;
    border-radius: 6px;

    background: #ede9fe;
    color: #7c3aed;
    font-size: 11px;
}

.endpoint-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;

    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
    cursor: text;
}

.endpoint-name-input {
    height: 24px;
}

.endpoint-type-select {
    flex: 0 0 auto;
    height: 22px;
    padding: 0 4px;

    border: 1px solid #ddd6fe;
    border-radius: 5px;
    outline: none;
    background: #ffffff;

    color: #6d28d9;
    font: inherit;
    font-size: 10px;
    cursor: pointer;
}

.endpoint-type-select.new {
    height: 28px;
    border-color: #e2e8f0;
    color: #475569;
    font-size: 11px;
}

/* The delete button is always visible on the card, not only on row hover */
.endpoint-delete {
    opacity: 1;
}

.endpoint-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.endpoint-chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;

    padding: 1px 3px 1px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 999px;

    background: #ffffff;
    font-size: 11px;
}

.endpoint-chip.object {
    border-color: #c7d2fe;
    background: #eef2ff;
    color: #3730a3;
}

.endpoint-chip button {
    width: 16px;
    height: 16px;
    padding: 0;

    border: 0;
    border-radius: 50%;
    background: transparent;

    color: #94a3b8;
    cursor: pointer;
}

.endpoint-chip button:hover {
    background: #fee2e2;
    color: #dc2626;
}

.endpoint-card :deep(.detail-prime-select.p-select) {
    background: #ffffff;
}
</style>
