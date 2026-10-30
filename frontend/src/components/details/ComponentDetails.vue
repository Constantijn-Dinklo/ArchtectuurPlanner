<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { Select } from 'primevue';
    import { vCollapsible } from '../../directives/collapsible';
    import { useComponentStore } from '../../stores/resources/component.store';
    import { useInformationFieldStore } from '../../stores/information/informationField.store';
    import { useInformationObjectStore } from '../../stores/information/informationObject.store';
    import { useResourceService } from '../../services/resources/resource.service';
    import { useSendableInformationService } from '../../services/sendableInformation.service';
    import { FILE_TYPES, getComponentIcon, getInformationSlotIds, type ComponentEnd, type ComponentEndTarget, type FileType, type InformationSlot } from '../../types/component.types';
    import type { ResourceType } from '../../types/resource.type';

    // The details of a component: a script (what it reads and writes, what it takes in and produces) or a file (what it contains)
    const props = defineProps<{
        componentId: string;
    }>();

    const componentStore = useComponentStore();
    const informationFieldStore = useInformationFieldStore();
    const informationObjectStore = useInformationObjectStore();
    const resourceService = useResourceService();
    const sendableInformationService = useSendableInformationService();

    const component = computed(() => componentStore.getComponent(props.componentId));
    const host = computed(() => component.value ? resourceService.getResource(component.value.resourceId) : undefined);

    const RESOURCE_ICONS: Record<ResourceType, string> = {
        application: 'pi pi-desktop',
        database: 'pi pi-database',
        table: 'pi pi-table',
        fileLocation: 'pi pi-folder',
        server: 'pi pi-server',
        external: 'pi pi-globe'
    };

    // <-- What a script can read from and write to: resources (a table as well) and files -->
    interface EndOption {
        key: string;
        end: ComponentEndTarget;
        label: string;
        icon: string;
    }

    function endKey(end: ComponentEndTarget) {
        return `${end.resourceId}:${end.componentId ?? ''}`;
    }

    function describeEnd(end: ComponentEndTarget): { label: string, icon: string } {
        const resource = resourceService.getResource(end.resourceId);
        if (end.componentId) {
            const file = componentStore.getComponent(end.componentId);
            return {
                label: `${resource?.name ?? '?'} › ${file?.name ?? 'Unknown file'}`,
                icon: file ? getComponentIcon(file) : 'pi pi-file'
            };
        }
        if (resource?.type === 'table') {
            const database = resourceService.getResource(resource.databaseId);
            return { label: `${database?.name ?? '?'} › ${resource.name}`, icon: RESOURCE_ICONS.table };
        }
        return { label: resource?.name ?? 'Unknown resource', icon: resource ? RESOURCE_ICONS[resource.type] : 'pi pi-box' };
    }

    const endOptions = computed<EndOption[]>(() => {
        const resources = resourceService.getByType(['application', 'database', 'table', 'fileLocation', 'external'])
            .map(resource => ({ resourceId: resource.id, componentId: null }));
        const files = componentStore.components
            .filter(candidate => candidate.kind === 'file')
            .map(file => ({ resourceId: file.resourceId, componentId: file.id }));

        return [...resources, ...files]
            .map(end => ({ key: endKey(end), end, ...describeEnd(end) }))
            .sort((a, b) => a.label.localeCompare(b.label));
    });

    function addEnd(side: 'inputs' | 'outputs', option: EndOption | undefined) {
        if (!option || !component.value) return;
        componentStore.addEnd(component.value.id, side, option.end);
    }

    // <-- The information a script takes in: what the things it reads from can pass on -->
    type InformationOption = { id: string, label: string };

    function byLabel(options: Map<string, InformationOption>) {
        return [...options.values()].sort((a, b) => a.label.localeCompare(b.label));
    }

    // What one end can pass on: a file passes on what it contains, a resource what it can send
    function getEndFieldOptions(end: ComponentEndTarget, fields = new Map<string, InformationOption>()) {
        if (end.componentId) {
            componentStore.getComponent(end.componentId)?.informationFieldIds.forEach(fieldId => {
                const field = informationFieldStore.getInformationField(fieldId);
                if (field) fields.set(field.id, { id: field.id, label: field.fieldName });
            });
        } else {
            sendableInformationService.getSendableFields(end.resourceId)
                .forEach(field => fields.set(field.id, { id: field.id, label: field.label }));
        }
        return fields;
    }

    function getEndObjectOptions(end: ComponentEndTarget, objects = new Map<string, InformationOption>()) {
        const objectIds = end.componentId
            ? componentStore.getComponent(end.componentId)?.informationObjectIds ?? []
            : sendableInformationService.getSendableObjects(end.resourceId).map(object => object.id);
        objectIds.forEach(objectId => {
            const informationObject = informationObjectStore.getInformationObject(objectId);
            if (informationObject) objects.set(informationObject.id, { id: informationObject.id, label: informationObject.objectName });
        });
        return objects;
    }

    const readableFields = computed(() => {
        const fields = new Map<string, InformationOption>();
        component.value?.inputs.forEach(input => getEndFieldOptions(input, fields));
        return byLabel(fields);
    });

    const readableObjects = computed(() => {
        const objects = new Map<string, InformationOption>();
        component.value?.inputs.forEach(input => getEndObjectOptions(input, objects));
        return byLabel(objects);
    });

    // <-- The information per end: what the script reads from it or writes to it -->
    type Side = 'inputs' | 'outputs';

    // The opened ends, keyed by side and end
    const expandedEnds = ref<Set<string>>(new Set());

    function toggleEnd(side: Side, end: ComponentEnd) {
        const key = `${side}:${endKey(end)}`;
        const expanded = new Set(expandedEnds.value);
        if (expanded.has(key)) {
            expanded.delete(key);
        } else {
            expanded.add(key);
        }
        expandedEnds.value = expanded;
    }

    function isEndExpanded(side: Side, end: ComponentEnd) {
        return expandedEnds.value.has(`${side}:${endKey(end)}`);
    }

    function getEndFields(end: ComponentEnd) {
        return end.informationFieldIds
            .map(fieldId => informationFieldStore.getInformationField(fieldId))
            .filter(field => field !== undefined);
    }

    function getEndObjects(end: ComponentEnd) {
        return end.informationObjectIds
            .map(objectId => informationObjectStore.getInformationObject(objectId))
            .filter(informationObject => informationObject !== undefined);
    }

    // A script reads what the end can pass on, and writes what it takes in
    function getEndFieldChoices(side: Side, end: ComponentEnd) {
        return side === 'inputs' ? byLabel(getEndFieldOptions(end)) : producible.value.fields;
    }

    function getEndObjectChoices(side: Side, end: ComponentEnd) {
        return side === 'inputs' ? byLabel(getEndObjectOptions(end)) : producible.value.objects;
    }

    // New information can only be written: a script only reads what already exists, but can make something new
    const newEndFieldNames = ref<Record<string, string>>({});
    const newEndObjectNames = ref<Record<string, string>>({});

    function addNewEndField(side: Side, index: number, end: ComponentEnd) {
        const key = `${side}:${endKey(end)}`;
        const fieldName = newEndFieldNames.value[key]?.trim();
        if (!fieldName || !component.value) return;
        componentStore.addEndInformationField(component.value.id, side, index, { fieldName });
        newEndFieldNames.value[key] = '';
    }

    function addNewEndObject(side: Side, index: number, end: ComponentEnd) {
        const key = `${side}:${endKey(end)}`;
        const objectName = newEndObjectNames.value[key]?.trim();
        if (!objectName || !component.value) return;
        componentStore.addEndInformationObject(component.value.id, side, index, { objectName });
        newEndObjectNames.value[key] = '';
    }

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

    // A file can only contain what scripts write to it (or new information put in it)
    const containable = computed(() => {
        const writes = componentStore.components
            .filter(candidate => candidate.kind === 'script')
            .flatMap(script => script.outputs.filter(end => end.componentId === props.componentId));
        return toOptions(writes.flatMap(end => end.informationFieldIds), writes.flatMap(end => end.informationObjectIds));
    });

    interface InformationSection {
        slot: InformationSlot;
        title: string;
        empty: string;
        fieldOptions: { id: string, label: string }[];
        objectOptions: { id: string, label: string }[];
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
                empty: 'Nothing taken in yet. Add what the script uses from what it reads.',
                fieldOptions: readableFields.value,
                objectOptions: readableObjects.value,
                fieldOptionsEmpty: 'Add what the script reads from first',
                objectOptionsEmpty: 'What the script reads from has no objects',
                allowNew: false
            },
            {
                slot: 'output',
                title: 'Outputs',
                empty: 'Nothing produced yet. Add what the script delivers to what it writes to.',
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
                fieldOptionsEmpty: 'No script writes fields to this file',
                objectOptionsEmpty: 'No script writes objects to this file',
                allowNew: true
            }
        ]);

    function getSlotFields(slot: InformationSlot) {
        if (!component.value) return [];
        return getInformationSlotIds(component.value, slot).informationFieldIds
            .map(fieldId => informationFieldStore.getInformationField(fieldId))
            .filter(field => field !== undefined);
    }

    function getSlotObjects(slot: InformationSlot) {
        if (!component.value) return [];
        return getInformationSlotIds(component.value, slot).informationObjectIds
            .map(objectId => informationObjectStore.getInformationObject(objectId))
            .filter(informationObject => informationObject !== undefined);
    }

    function hasSlotField(slot: InformationSlot, fieldId: string) {
        return !!component.value && getInformationSlotIds(component.value, slot).informationFieldIds.includes(fieldId);
    }

    function hasSlotObject(slot: InformationSlot, objectId: string) {
        return !!component.value && getInformationSlotIds(component.value, slot).informationObjectIds.includes(objectId);
    }

    const newFieldNames = ref<Partial<Record<InformationSlot, string>>>({});
    const newObjectNames = ref<Partial<Record<InformationSlot, string>>>({});

    function addNewField(slot: InformationSlot) {
        const fieldName = newFieldNames.value[slot]?.trim();
        if (!fieldName || !component.value) return;
        componentStore.addInformationField(component.value.id, slot, { fieldName });
        newFieldNames.value[slot] = '';
    }

    function addNewObject(slot: InformationSlot) {
        const objectName = newObjectNames.value[slot]?.trim();
        if (!objectName || !component.value) return;
        componentStore.addInformationObject(component.value.id, slot, { objectName });
        newObjectNames.value[slot] = '';
    }

    // The scripts that read from or write to this file
    const usedByScripts = computed(() =>
        componentStore.components.filter(candidate =>
            candidate.kind === 'script' &&
            [...candidate.inputs, ...candidate.outputs].some(end => end.componentId === props.componentId)
        )
    );

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
            <section
                v-for="side in (['inputs', 'outputs'] as const)"
                :key="side"
                v-collapsible
                class="detail-section"
            >
                <div class="detail-section-title">
                    <span>{{ side === 'inputs' ? 'Reads from' : 'Writes to' }}</span>
                    <span class="detail-count">{{ component[side].length }}</span>
                </div>

                <div v-if="!component[side].length" class="detail-empty">
                    {{ side === 'inputs' ? 'Nothing read yet' : 'Nothing written yet' }}
                </div>

                <div
                    v-for="(end, index) in component[side]"
                    :key="endKey(end)"
                    class="script-end"
                >
                    <!-- Opening an end shows the information read from it or written to it -->
                    <div
                        class="detail-row end-row"
                        :title="side === 'inputs' ? 'Show what is read from this' : 'Show what is written to this'"
                        @click="toggleEnd(side, end)"
                    >
                        <i class="pi pi-chevron-right end-expand" :class="{ expanded: isEndExpanded(side, end) }" />
                        <i :class="describeEnd(end).icon" class="detail-row-icon" />
                        <span class="detail-row-name">{{ describeEnd(end).label }}</span>
                        <span class="detail-count">{{ end.informationObjectIds.length + end.informationFieldIds.length }}</span>
                        <button
                            type="button"
                            class="detail-delete-button"
                            :title="side === 'inputs' ? 'No longer read' : 'No longer written'"
                            @click.stop="componentStore.removeEnd(component.id, side, index)"
                        >
                            ×
                        </button>
                    </div>

                    <div v-if="isEndExpanded(side, end)" class="end-information">
                        <div v-if="!getEndObjects(end).length && !getEndFields(end).length" class="detail-empty">
                            {{ side === 'inputs' ? 'Nothing read from this yet' : 'Nothing written to this yet' }}
                        </div>

                        <div class="information-chips">
                            <span v-for="informationObject in getEndObjects(end)" :key="informationObject.id" class="information-chip object">
                                ▱ {{ informationObject.objectName }}
                                <button type="button" title="Remove" @click="componentStore.removeEndInformationObject(component.id, side, index, informationObject.id)">×</button>
                            </span>
                            <span v-for="field in getEndFields(end)" :key="field.id" class="information-chip">
                                {{ field.fieldName }}
                                <button type="button" title="Remove" @click="componentStore.removeEndInformationField(component.id, side, index, field.id)">×</button>
                            </span>
                        </div>

                        <div class="information-pickers">
                            <Select
                                :model-value="undefined"
                                :options="getEndObjectChoices(side, end)"
                                option-label="label"
                                :option-disabled="(option: InformationOption) => end.informationObjectIds.includes(option.id)"
                                placeholder="+ Object"
                                filter
                                filter-placeholder="Search object"
                                :empty-message="side === 'inputs' ? 'This has no objects to read' : 'The script takes in no objects yet'"
                                size="small"
                                class="detail-prime-select"
                                @change="event => event.value && componentStore.addEndInformationObject(component!.id, side, index, { informationObjectId: event.value.id })"
                            />
                            <Select
                                :model-value="undefined"
                                :options="getEndFieldChoices(side, end)"
                                option-label="label"
                                :option-disabled="(option: InformationOption) => end.informationFieldIds.includes(option.id)"
                                placeholder="+ Field"
                                filter
                                filter-placeholder="Search field"
                                :empty-message="side === 'inputs' ? 'This has no fields to read' : 'The script takes in no fields yet'"
                                size="small"
                                class="detail-prime-select"
                                @change="event => event.value && componentStore.addEndInformationField(component!.id, side, index, { informationFieldId: event.value.id })"
                            />
                        </div>

                        <!-- What a script writes can also be new information -->
                        <template v-if="side === 'outputs'">
                            <div class="detail-add-row">
                                <input
                                    v-model="newEndObjectNames[`${side}:${endKey(end)}`]"
                                    type="text"
                                    class="detail-input"
                                    placeholder="+ New information object"
                                    @keyup.enter="addNewEndObject(side, index, end)"
                                />
                                <button
                                    type="button"
                                    class="detail-add-button"
                                    :disabled="!newEndObjectNames[`${side}:${endKey(end)}`]?.trim()"
                                    @click="addNewEndObject(side, index, end)"
                                >
                                    <i class="pi pi-plus" />
                                </button>
                            </div>
                            <div class="detail-add-row">
                                <input
                                    v-model="newEndFieldNames[`${side}:${endKey(end)}`]"
                                    type="text"
                                    class="detail-input"
                                    placeholder="+ New information field"
                                    @keyup.enter="addNewEndField(side, index, end)"
                                />
                                <button
                                    type="button"
                                    class="detail-add-button"
                                    :disabled="!newEndFieldNames[`${side}:${endKey(end)}`]?.trim()"
                                    @click="addNewEndField(side, index, end)"
                                >
                                    <i class="pi pi-plus" />
                                </button>
                            </div>
                        </template>
                    </div>
                </div>

                <Select
                    :model-value="undefined"
                    :options="endOptions"
                    option-label="label"
                    :option-disabled="(option: EndOption) => component![side].some(end => endKey(end) === option.key)"
                    :placeholder="side === 'inputs' ? '+ Reads from…' : '+ Writes to…'"
                    filter
                    filter-placeholder="Search resource, table or file"
                    size="small"
                    class="detail-prime-select"
                    @change="event => addEnd(side, event.value)"
                />
            </section>
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
                <span class="detail-count">{{ getSlotObjects(section.slot).length + getSlotFields(section.slot).length }}</span>
            </div>

            <div v-if="!getSlotObjects(section.slot).length && !getSlotFields(section.slot).length" class="detail-empty">
                {{ section.empty }}
            </div>

            <div class="information-chips">
                <span v-for="informationObject in getSlotObjects(section.slot)" :key="informationObject.id" class="information-chip object">
                    ▱ {{ informationObject.objectName }}
                    <button type="button" title="Remove" @click="componentStore.removeInformationObject(component.id, section.slot, informationObject.id)">×</button>
                </span>
                <span v-for="field in getSlotFields(section.slot)" :key="field.id" class="information-chip">
                    {{ field.fieldName }}
                    <button type="button" title="Remove" @click="componentStore.removeInformationField(component.id, section.slot, field.id)">×</button>
                </span>
            </div>

            <div class="information-pickers">
                <Select
                    :model-value="undefined"
                    :options="section.objectOptions"
                    option-label="label"
                    :option-disabled="(option: { id: string }) => hasSlotObject(section.slot, option.id)"
                    placeholder="+ Object"
                    filter
                    filter-placeholder="Search object"
                    :empty-message="section.objectOptionsEmpty"
                    size="small"
                    class="detail-prime-select"
                    @change="event => event.value && componentStore.addInformationObject(component!.id, section.slot, { informationObjectId: event.value.id })"
                />
                <Select
                    :model-value="undefined"
                    :options="section.fieldOptions"
                    option-label="label"
                    :option-disabled="(option: { id: string }) => hasSlotField(section.slot, option.id)"
                    placeholder="+ Field"
                    filter
                    filter-placeholder="Search field"
                    :empty-message="section.fieldOptionsEmpty"
                    size="small"
                    class="detail-prime-select"
                    @change="event => event.value && componentStore.addInformationField(component!.id, section.slot, { informationFieldId: event.value.id })"
                />
            </div>

            <!-- Outputs of a script and the contents of a file can also be new information -->
            <template v-if="section.allowNew">
                <div class="detail-add-row">
                    <input
                        v-model="newObjectNames[section.slot]"
                        type="text"
                        class="detail-input"
                        placeholder="+ New information object"
                        @keyup.enter="addNewObject(section.slot)"
                    />
                    <button type="button" class="detail-add-button" :disabled="!newObjectNames[section.slot]?.trim()" @click="addNewObject(section.slot)">
                        <i class="pi pi-plus" />
                    </button>
                </div>
                <div class="detail-add-row">
                    <input
                        v-model="newFieldNames[section.slot]"
                        type="text"
                        class="detail-input"
                        placeholder="+ New information field"
                        @keyup.enter="addNewField(section.slot)"
                    />
                    <button type="button" class="detail-add-button" :disabled="!newFieldNames[section.slot]?.trim()" @click="addNewField(section.slot)">
                        <i class="pi pi-plus" />
                    </button>
                </div>
            </template>
        </section>

        <!-- File: the scripts that use it -->
        <section v-if="component.kind === 'file'" v-collapsible class="detail-section">
            <div class="detail-section-title">
                <span>Used by scripts</span>
                <span class="detail-count">{{ usedByScripts.length }}</span>
            </div>
            <div v-if="!usedByScripts.length" class="detail-empty">No script reads from or writes to this file</div>
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

/* An end of a script: opening it shows what is read from it or written to it */
.end-row {
    cursor: pointer;
}

.end-expand {
    color: #94a3b8;
    font-size: 8px;
    transition: transform 0.15s ease;
}

.end-expand.expanded {
    transform: rotate(90deg);
}

.end-information {
    margin: 2px 0 6px 14px;
    padding: 4px 0 2px 8px;
    border-left: 2px solid #e0e7ff;
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
