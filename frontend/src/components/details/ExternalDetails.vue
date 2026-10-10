<script setup lang="ts">
    import { vCollapsible } from '../../directives/collapsible';
    import { computed, ref } from 'vue';
    import { Select } from 'primevue';
    import { useSelectedNodeProjection } from '../../projections/selectedNode.projection';
    import { useExternalService } from '../../services/resources/external.service';
    import { useInformationFieldStore } from '../../stores/information/informationField.store';
    import { useInformationObjectStore } from '../../stores/information/informationObject.store';
    import { EXTERNAL_KINDS, getExternalKindInfo, type ExternalKind, type ResolvedExternal } from '../../types/external.types';
    import type { InformationField } from '../../types/informationField.type';
    import type { InformationObject } from '../../types/informationObject.type';
    import ConnectionsDetail from '../ConnectionsDetail.vue';
    import ApisSection from './ApisSection.vue';

    const selectedNodeProjection = useSelectedNodeProjection();
    const externalService = useExternalService();
    const informationFieldStore = useInformationFieldStore();
    const informationObjectStore = useInformationObjectStore();

    const external = computed(
        () => selectedNodeProjection.nodeInfo.value?.node as ResolvedExternal | undefined
    );

    const newProvidedFieldName = ref('');
    const newProvidedObjectName = ref('');

    // Any existing information can be provided by an external element
    const allInformationFields = computed(() =>
        [...informationFieldStore.informationFields.values()].sort((a, b) => a.fieldName.localeCompare(b.fieldName))
    );
    const allInformationObjects = computed(() =>
        [...informationObjectStore.informationObjects.values()].sort((a, b) => a.objectName.localeCompare(b.objectName))
    );

    function updateProperty(property: 'name' | 'externalOrganisation' | 'owner' | 'description', value: string) {
        if (!external.value) return;
        if (property === 'name' && !value.trim()) return;
        externalService.updateExternal(external.value.id, { [property]: value });
    }

    function updateKind(kind: ExternalKind) {
        if (!external.value) return;
        externalService.updateExternal(external.value.id, { kind });
    }

    function addNewProvidedField() {
        const fieldName = newProvidedFieldName.value.trim();
        if (!external.value || !fieldName) return;
        externalService.addProvidedInformationField(external.value.id, { fieldName });
        newProvidedFieldName.value = '';
    }

    function addNewProvidedObject() {
        const objectName = newProvidedObjectName.value.trim();
        if (!external.value || !objectName) return;
        externalService.addProvidedInformationObject(external.value.id, { objectName });
        newProvidedObjectName.value = '';
    }
</script>

<template>
    <div v-if="external">
        <header class="detail-header">
            <span class="detail-header-icon external"><i :class="getExternalKindInfo(external.kind).icon" /></span>
            <div class="detail-header-text">
                <span class="detail-type-label">External</span>
                <h2>{{ external.name }}</h2>
            </div>
        </header>

        <section v-collapsible class="detail-section">
            <div class="detail-section-title">Properties</div>

            <label class="detail-property">
                <span class="detail-property-label">Name</span>
                <input
                    :value="external.name"
                    type="text"
                    class="detail-input"
                    @change="updateProperty('name', ($event.target as HTMLInputElement).value)"
                />
            </label>

            <label class="detail-property">
                <span class="detail-property-label">Kind</span>
                <select
                    :value="external.kind"
                    class="detail-select"
                    @change="updateKind(($event.target as HTMLSelectElement).value as ExternalKind)"
                >
                    <option
                        v-for="externalKind in EXTERNAL_KINDS"
                        :key="externalKind.kind"
                        :value="externalKind.kind"
                    >
                        {{ externalKind.label }}
                    </option>
                </select>
            </label>

            <label class="detail-property">
                <span class="detail-property-label">Organisation</span>
                <input
                    :value="external.externalOrganisation"
                    type="text"
                    class="detail-input"
                    placeholder="e.g. Belastingdienst"
                    @change="updateProperty('externalOrganisation', ($event.target as HTMLInputElement).value)"
                />
            </label>

            <label class="detail-property">
                <span class="detail-property-label">Owner</span>
                <input
                    :value="external.owner"
                    type="text"
                    class="detail-input"
                    placeholder="Contact or department"
                    @change="updateProperty('owner', ($event.target as HTMLInputElement).value)"
                />
            </label>

            <label class="detail-property description">
                <span class="detail-property-label">Description</span>
                <textarea
                    :value="external.description"
                    class="detail-input detail-textarea"
                    rows="3"
                    placeholder="What is this element and what is it used for?"
                    @change="updateProperty('description', ($event.target as HTMLTextAreaElement).value)"
                />
            </label>
        </section>

        <!-- The information we can read from the external element -->
        <section v-collapsible class="detail-section">
            <div class="detail-section-title">
                <span>Provides</span>
                <span class="detail-count">
                    {{ external.providedInformationObjects.length + external.providedInformationFields.length }}
                </span>
            </div>

            <div
                v-if="!external.providedInformationObjects.length && !external.providedInformationFields.length"
                class="detail-empty"
            >
                Nothing provided yet. Add the information that can be read from this element.
            </div>

            <div class="detail-subtitle" v-if="external.providedInformationObjects.length">Information objects</div>
            <div
                v-for="reference in external.providedInformationObjects"
                :key="reference.informationObject.id"
                class="detail-row"
                :title="reference.informationObject.informationFields.map(field => field.fieldName).join(', ') || 'No fields'"
            >
                <span class="detail-row-icon object-icon">▱</span>
                <span class="detail-row-name">{{ reference.informationObject.objectName }}</span>
                <span class="detail-count">{{ reference.informationObject.informationFields.length }}</span>
                <button
                    type="button"
                    class="detail-delete-button"
                    title="No longer provided"
                    @click="externalService.removeProvidedInformationObject(external.id, reference.informationObject.id)"
                >
                    ×
                </button>
            </div>

            <div class="detail-subtitle" v-if="external.providedInformationFields.length">Information fields</div>
            <div
                v-for="reference in external.providedInformationFields"
                :key="reference.informationField.id"
                class="detail-row"
            >
                <span class="detail-row-name">{{ reference.informationField.fieldName }}</span>
                <button
                    type="button"
                    class="detail-delete-button"
                    title="No longer provided"
                    @click="externalService.removeProvidedInformationField(external.id, reference.informationField.id)"
                >
                    ×
                </button>
            </div>

            <Select
                :model-value="undefined"
                :options="allInformationObjects"
                option-label="objectName"
                :option-disabled="(informationObject: InformationObject) =>
                    external!.providedInformationObjects.some(reference => reference.informationObject.id === informationObject.id)"
                placeholder="+ Add existing object"
                filter
                filter-placeholder="Search object"
                empty-message="No information objects yet"
                size="small"
                class="detail-prime-select"
                @change="event => event.value && externalService.addProvidedInformationObject(external!.id, { informationObjectId: event.value.id })"
            />

            <div class="detail-add-row">
                <input
                    v-model="newProvidedObjectName"
                    type="text"
                    class="detail-input"
                    placeholder="+ New information object"
                    @keyup.enter="addNewProvidedObject"
                />
                <button
                    type="button"
                    class="detail-add-button"
                    title="Add information object"
                    :disabled="!newProvidedObjectName.trim()"
                    @click="addNewProvidedObject"
                >
                    <i class="pi pi-plus" />
                </button>
            </div>

            <Select
                :model-value="undefined"
                :options="allInformationFields"
                option-label="fieldName"
                :option-disabled="(field: InformationField) =>
                    external!.providedInformationFields.some(reference => reference.informationField.id === field.id)"
                placeholder="+ Add existing field"
                filter
                filter-placeholder="Search field"
                empty-message="No information fields yet"
                size="small"
                class="detail-prime-select"
                @change="event => event.value && externalService.addProvidedInformationField(external!.id, { informationFieldId: event.value.id })"
            />

            <div class="detail-add-row">
                <input
                    v-model="newProvidedFieldName"
                    type="text"
                    class="detail-input"
                    placeholder="+ New information field"
                    @keyup.enter="addNewProvidedField"
                />
                <button
                    type="button"
                    class="detail-add-button"
                    title="Add information field"
                    :disabled="!newProvidedFieldName.trim()"
                    @click="addNewProvidedField"
                >
                    <i class="pi pi-plus" />
                </button>
            </div>
        </section>

        <!-- The apis the external element offers, and what is sent through them -->
        <ApisSection :resource-id="external.id" />

        <!-- The information we send to the external element. Filled in by the connections to it -->
        <section v-collapsible class="detail-section">
            <div class="detail-section-title">
                <span>Receives</span>
                <span class="detail-count">
                    {{ external.receivedInformationObjects.length + external.receivedInformationFields.length }}
                </span>
            </div>

            <div
                v-if="!external.receivedInformationObjects.length && !external.receivedInformationFields.length"
                class="detail-empty"
            >
                Nothing is sent to this element yet
            </div>

            <div
                v-for="reference in external.receivedInformationObjects"
                :key="reference.informationObject.id"
                class="detail-row"
            >
                <span class="detail-row-icon object-icon">▱</span>
                <span class="detail-row-name">{{ reference.informationObject.objectName }}</span>
            </div>

            <div
                v-for="reference in external.receivedInformationFields"
                :key="reference.informationField.id"
                class="detail-row"
            >
                <span class="detail-row-name">{{ reference.informationField.fieldName }}</span>
            </div>
        </section>

        <ConnectionsDetail
            v-if="selectedNodeProjection.nodeInfo.value"
            :connections-info="selectedNodeProjection.nodeInfo.value.connections"
        />
    </div>
</template>

<style scoped>
.detail-property.description {
    align-items: flex-start;
    padding-top: 4px;
}

.detail-property.description .detail-property-label {
    padding-top: 6px;
}

.detail-textarea {
    height: auto;
    min-height: 56px;
    padding: 6px 8px;
    resize: vertical;
}

.api-item + .api-item {
    padding-top: 4px;
    border-top: 1px dashed #eef2f7;
}

.api-auth {
    display: inline-flex;
    align-items: center;
    gap: 3px;

    color: #64748b;
    font-size: 10px;
    cursor: pointer;
}

.object-icon {
    color: #6366f1;
    font-size: 11px;
}
</style>
