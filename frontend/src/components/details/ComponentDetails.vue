<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { vCollapsible } from '../../directives/collapsible';
    import { useComponentStore } from '../../stores/resources/component.store';
    import { useInformationFieldStore } from '../../stores/information/informationField.store';
    import { useInformationObjectStore } from '../../stores/information/informationObject.store';
    import { useResourceService } from '../../services/resources/resource.service';
    import { byLabel } from '../../services/connectionEndOptions.service';
    import { useConnectionStore } from '../../stores/connection.store';
    import { useInformationRelationStore } from '../../stores/information/informationRelation.store';
    import { FILE_TYPES, getComponentIcon, getInformationSlotIds, type FileType, type InformationSlot } from '../../types/component.types';
    import type { InformationOption } from '../../types/connectionEnd.types';
    import InformationRelationsSection from './InformationRelationsSection.vue';
    import InformationEditor from './InformationEditor.vue';

    // The details of a component: a script (what it reads and writes, what it takes in and produces) or a file (what it contains)
    const props = defineProps<{
        componentId: string;
    }>();

    const componentStore = useComponentStore();
    const informationFieldStore = useInformationFieldStore();
    const informationObjectStore = useInformationObjectStore();
    const resourceService = useResourceService();
    const connectionStore = useConnectionStore();
    const informationRelationStore = useInformationRelationStore();

    const component = computed(() => componentStore.getComponent(props.componentId));
    const host = computed(() => component.value ? resourceService.getResource(component.value.resourceId) : undefined);

    // <-- What a script produces and a file contains: only what actually gets there, or new information -->

    // The fields and objects out of these lists, a field also when it is inside one of the objects
    function toOptions(fieldIds: string[], objectIds: string[]) {
        const fields = new Map<string, InformationOption>();
        const objects = new Map<string, InformationOption>();
        for (const objectId of objectIds) {
            const informationObject = informationObjectStore.getInformationObject(objectId);
            if (!informationObject) continue;
            objects.set(informationObject.id, { id: informationObject.id, label: informationObject.objectName });
            fieldIds = [...fieldIds, ...informationObject.informationFieldIds];
        }
        for (const fieldId of fieldIds) {
            const field = informationFieldStore.getInformationField(fieldId);
            if (field) fields.set(field.id, { id: field.id, label: field.fieldName });
        }
        return { fields: byLabel(fields), objects: byLabel(objects) };
    }

    // A script can only write what it takes in (or new information it makes itself)
    const producible = computed(() => component.value
        ? toOptions(component.value.inputInformationFieldIds, component.value.inputInformationObjectIds)
        : { fields: [], objects: [] }
    );

    // A file can contain what is written to its file location (or new information put in it). Until files are relation
    // ends that is all that is known of what reaches the file
    const containable = computed(() => {
        const locationId = component.value?.resourceId;
        return toOptions(
            informationRelationStore.fieldRelations.filter(relation => relation.targetResourceId === locationId).map(relation => relation.informationFieldId),
            informationRelationStore.objectRelations.filter(relation => relation.targetResourceId === locationId).map(relation => relation.informationObjectId)
        );
    });

    interface InformationSection {
        slot: InformationSlot;
        title: string;
        empty: string;
        fieldOptions: InformationOption[];
        objectOptions: InformationOption[];
        fieldOptionsEmpty: string;
        objectOptionsEmpty: string;
        // Whether new information can be made here (a script only takes in what exists where it reads from)
        allowNew: boolean;
    }

    // A script has inputs and outputs like an application, a file contains information
    const informationSections = computed<InformationSection[]>(() => component.value?.kind === 'script'
        ? [
            {
                slot: 'input',
                title: 'Inputs',
                // Like an application: what it reads is chosen under Reads from, here only new information is made
                empty: 'Nothing taken in yet. Choose what the script reads under Reads from.',
                fieldOptions: [],
                objectOptions: [],
                fieldOptionsEmpty: 'Choose what the script reads under Reads from',
                objectOptionsEmpty: 'Choose what the script reads under Reads from',
                allowNew: true
            },
            {
                slot: 'output',
                title: 'Outputs',
                empty: 'Nothing produced yet. Add what the script delivers, then choose where it goes under Writes to.',
                fieldOptions: producible.value.fields,
                objectOptions: producible.value.objects,
                fieldOptionsEmpty: 'The script takes in no fields yet',
                objectOptionsEmpty: 'The script takes in no objects yet',
                allowNew: true
            }
        ]
        : [
            {
                slot: 'contains',
                title: 'Contains',
                empty: 'Nothing yet. Add the information stored in this file.',
                fieldOptions: containable.value.fields,
                objectOptions: containable.value.objects,
                fieldOptionsEmpty: 'Nothing is written to its file location yet',
                objectOptionsEmpty: 'Nothing is written to its file location yet',
                allowNew: true
            }
        ]);

    function getSlotIds(slot: InformationSlot) {
        return component.value
            ? getInformationSlotIds(component.value, slot)
            : { informationFieldIds: [], informationObjectIds: [] };
    }

    function getSlotCount(slot: InformationSlot) {
        const ids = getSlotIds(slot);
        return ids.informationFieldIds.length + ids.informationObjectIds.length;
    }

    // The scripts connected to the file location of this file; which of them use this file is not known until files
    // are relation ends
    const usedByScripts = computed(() => {
        const locationId = component.value?.resourceId;
        const scriptIds = new Set(connectionStore.connections.flatMap(connection =>
            connection.source.id === locationId ? [connection.target.id] : connection.target.id === locationId ? [connection.source.id] : []
        ));
        return componentStore.components.filter(candidate => candidate.kind === 'script' && scriptIds.has(candidate.id));
    });

    function updateProperty(property: 'name' | 'description', value: string) {
        if (!component.value || (property === 'name' && !value.trim())) return;
        componentStore.updateComponent(component.value.id, { [property]: value });
    }

    // Deleting asks for a second click, so a component is not removed by accident
    const isConfirmingDelete = ref(false);
    let confirmTimeout: ReturnType<typeof setTimeout> | undefined;

    function onDeleteClick() {
        if (!component.value) return;
        if (!isConfirmingDelete.value) {
            isConfirmingDelete.value = true;
            confirmTimeout = setTimeout(() => { isConfirmingDelete.value = false; }, 3000);
            return;
        }
        clearTimeout(confirmTimeout);
        isConfirmingDelete.value = false;
        componentStore.deleteComponent(component.value.id);
    }
</script>

<template>
    <div v-if="component">
        <header class="detail-header">
            <span class="detail-header-icon" :class="component.kind">
                <i :class="getComponentIcon(component)" />
            </span>
            <div class="detail-header-text">
                <span class="detail-type-label">{{ component.kind === 'script' ? 'Script' : 'File' }} · part of {{ host?.name ?? '?' }}</span>
                <h2>{{ component.name }}</h2>
            </div>
            <button
                type="button"
                class="delete-component-button"
                :class="{ confirming: isConfirmingDelete }"
                @click="onDeleteClick"
            >
                <i class="pi pi-trash" />
                {{ isConfirmingDelete ? 'Click again to delete' : 'Delete' }}
            </button>
        </header>

        <section v-collapsible class="detail-section">
            <div class="detail-section-title">Properties</div>

            <label class="detail-property">
                <span class="detail-property-label">Name</span>
                <input
                    :value="component.name"
                    type="text"
                    class="detail-input"
                    @change="updateProperty('name', ($event.target as HTMLInputElement).value)"
                />
            </label>

            <label v-if="component.kind === 'file'" class="detail-property">
                <span class="detail-property-label">File type</span>
                <select
                    :value="component.fileType"
                    class="detail-select"
                    @change="componentStore.updateComponent(component.id, { fileType: ($event.target as HTMLSelectElement).value as FileType })"
                >
                    <option v-for="option in FILE_TYPES" :key="option.fileType" :value="option.fileType">
                        {{ option.label }}
                    </option>
                </select>
            </label>

            <label class="detail-property description">
                <span class="detail-property-label">Description</span>
                <textarea
                    :value="component.description"
                    class="detail-input detail-textarea"
                    rows="2"
                    :placeholder="component.kind === 'script' ? 'What does the script do?' : 'What is the file used for?'"
                    @change="updateProperty('description', ($event.target as HTMLTextAreaElement).value)"
                />
            </label>
        </section>

        <!-- Script: what it reads from and writes to -->
        <template v-if="component.kind === 'script'">
            <InformationRelationsSection :resource-id="component.id" direction="incoming" />
            <InformationRelationsSection :resource-id="component.id" direction="outgoing" />
        </template>

        <!-- The information the script takes in and produces, or the file contains -->
        <section
            v-for="section in informationSections"
            :key="section.slot"
            v-collapsible
            class="detail-section"
        >
            <div class="detail-section-title">
                <span>{{ section.title }}</span>
                <span class="detail-count">{{ getSlotCount(section.slot) }}</span>
            </div>

            <!-- Outputs of a script and the contents of a file can also be new information -->
            <InformationEditor
                :information-field-ids="getSlotIds(section.slot).informationFieldIds"
                :information-object-ids="getSlotIds(section.slot).informationObjectIds"
                :field-options="section.fieldOptions"
                :object-options="section.objectOptions"
                :empty-text="section.empty"
                :field-options-empty="section.fieldOptionsEmpty"
                :object-options-empty="section.objectOptionsEmpty"
                :allow-new="section.allowNew"
                @add-field="information => componentStore.addInformationField(component!.id, section.slot, information)"
                @remove-field="id => componentStore.removeInformationField(component!.id, section.slot, id)"
                @add-object="information => componentStore.addInformationObject(component!.id, section.slot, information)"
                @remove-object="id => componentStore.removeInformationObject(component!.id, section.slot, id)"
            />
        </section>

        <!-- File: the scripts that use it -->
        <section v-if="component.kind === 'file'" v-collapsible class="detail-section">
            <div class="detail-section-title">
                <span>Scripts at its file location</span>
                <span class="detail-count">{{ usedByScripts.length }}</span>
            </div>
            <div v-if="!usedByScripts.length" class="detail-empty">No script reads from or writes to its file location</div>
            <div v-for="script in usedByScripts" :key="script.id" class="detail-row">
                <i class="pi pi-code detail-row-icon" />
                <span class="detail-row-name">{{ script.name }}</span>
            </div>
        </section>
    </div>
</template>

<style scoped>
.detail-header-icon.script {
    background: #eef2ff;
    color: #4f46e5;
}

.detail-header-icon.file {
    background: #fff7ed;
    color: #ea580c;
}

.delete-component-button {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 5px;
    height: 26px;
    padding: 0 9px;

    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #ffffff;

    color: #64748b;
    font-size: 11px;
    cursor: pointer;
}

.delete-component-button:hover {
    border-color: #fecaca;
    background: #fef2f2;
    color: #dc2626;
}

.delete-component-button.confirming {
    border-color: #dc2626;
    background: #dc2626;
    color: #ffffff;
}

.detail-property.description {
    align-items: flex-start;
    padding-top: 4px;
}

.detail-property.description .detail-property-label {
    padding-top: 6px;
}

.detail-textarea {
    height: auto;
    min-height: 44px;
    padding: 6px 8px;
    resize: vertical;
}
</style>
