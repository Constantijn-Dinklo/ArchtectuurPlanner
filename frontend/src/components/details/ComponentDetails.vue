<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { Select } from 'primevue';
    import { vCollapsible } from '../../directives/collapsible';
    import { useComponentStore } from '../../stores/resources/component.store';
    import { useInformationFieldStore } from '../../stores/information/informationField.store';
    import { useInformationObjectStore } from '../../stores/information/informationObject.store';
    import { useResourceService } from '../../services/resources/resource.service';
    import { useSendableInformationService } from '../../services/sendableInformation.service';
    import { FILE_TYPES, getComponentIcon, getInformationSlotIds, type ComponentEnd, type FileType, type InformationSlot } from '../../types/component.types';
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
        end: ComponentEnd;
        label: string;
        icon: string;
    }

    function endKey(end: ComponentEnd) {
        return `${end.resourceId}:${end.componentId ?? ''}`;
    }

    function describeEnd(end: ComponentEnd): { label: string, icon: string } {
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
    const readableFields = computed(() => {
        if (!component.value) return [];
        const fields = new Map<string, { id: string, label: string }>();
        for (const input of component.value.inputs) {
            if (input.componentId) {
                // A file passes on what it contains
                const file = componentStore.getComponent(input.componentId);
                file?.informationFieldIds.forEach(fieldId => {
                    const field = informationFieldStore.getInformationField(fieldId);
                    if (field) fields.set(field.id, { id: field.id, label: field.fieldName });
                });
            } else {
                sendableInformationService.getSendableFields(input.resourceId)
                    .forEach(field => fields.set(field.id, { id: field.id, label: field.label }));
            }
        }
        return [...fields.values()].sort((a, b) => a.label.localeCompare(b.label));
    });

    const readableObjects = computed(() => {
        if (!component.value) return [];
        const objects = new Map<string, { id: string, label: string }>();
        for (const input of component.value.inputs) {
            const objectIds = input.componentId
                ? componentStore.getComponent(input.componentId)?.informationObjectIds ?? []
                : sendableInformationService.getSendableObjects(input.resourceId).map(object => object.id);
            objectIds.forEach(objectId => {
                const informationObject = informationObjectStore.getInformationObject(objectId);
                if (informationObject) objects.set(informationObject.id, { id: informationObject.id, label: informationObject.objectName });
            });
        }
        return [...objects.values()].sort((a, b) => a.label.localeCompare(b.label));
    });

    // <-- What a script produces and a file contains: any existing information, or new information -->
    const allInformationFields = computed(() =>
        [...informationFieldStore.informationFields.values()]
            .map(field => ({ id: field.id, label: field.fieldName }))
            .sort((a, b) => a.label.localeCompare(b.label))
    );
    const allInformationObjects = computed(() =>
        [...informationObjectStore.informationObjects.values()]
            .map(informationObject => ({ id: informationObject.id, label: informationObject.objectName }))
            .sort((a, b) => a.label.localeCompare(b.label))
    );

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
                fieldOptions: allInformationFields.value,
                objectOptions: allInformationObjects.value,
                fieldOptionsEmpty: 'No information fields yet',
                objectOptionsEmpty: 'No information objects yet',
                allowNew: true
            }
        ]
        : [
            {
                slot: 'contains',
                title: 'Contains',
                empty: 'Nothing yet. Add the information stored in this file.',
                fieldOptions: allInformationFields.value,
                objectOptions: allInformationObjects.value,
                fieldOptionsEmpty: 'No information fields yet',
                objectOptionsEmpty: 'No information objects yet',
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
                    class="detail-row"
                >
                    <i :class="describeEnd(end).icon" class="detail-row-icon" />
                    <span class="detail-row-name">{{ describeEnd(end).label }}</span>
                    <button
                        type="button"
                        class="detail-delete-button"
                        :title="side === 'inputs' ? 'No longer read' : 'No longer written'"
                        @click="componentStore.removeEnd(component.id, side, index)"
                    >
                        ×
                    </button>
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

.information-pickers {
    display: flex;
    gap: 4px;
}

.information-pickers :deep(.detail-prime-select.p-select) {
    flex: 1;
    min-width: 0;
}
</style>
