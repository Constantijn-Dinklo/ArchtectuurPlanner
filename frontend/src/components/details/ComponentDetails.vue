<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { Select } from 'primevue';
    import { vCollapsible } from '../../directives/collapsible';
    import { useComponentStore } from '../../stores/resources/component.store';
    import { useInformationFieldStore } from '../../stores/information/informationField.store';
    import { useInformationObjectStore } from '../../stores/information/informationObject.store';
    import { useResourceService } from '../../services/resources/resource.service';
    import { useSendableInformationService } from '../../services/sendableInformation.service';
    import { FILE_TYPES, getComponentIcon, type ComponentEnd, type FileType } from '../../types/component.types';
    import type { ResourceType } from '../../types/resource.type';

    // The details of a component: a script (what it reads, writes and carries) or a file (what it contains)
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

    // <-- The information a script carries: what the things it reads from can pass on -->
    const carriableFields = computed(() => {
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

    const carriableObjects = computed(() => {
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

    // <-- The information a file contains: any existing information, or new information -->
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

    const fieldOptions = computed(() => component.value?.kind === 'script' ? carriableFields.value : allInformationFields.value);
    const objectOptions = computed(() => component.value?.kind === 'script' ? carriableObjects.value : allInformationObjects.value);

    const informationFields = computed(() =>
        (component.value?.informationFieldIds ?? [])
            .map(fieldId => informationFieldStore.getInformationField(fieldId))
            .filter(field => field !== undefined)
    );
    const informationObjects = computed(() =>
        (component.value?.informationObjectIds ?? [])
            .map(objectId => informationObjectStore.getInformationObject(objectId))
            .filter(informationObject => informationObject !== undefined)
    );

    const newFieldName = ref('');
    const newObjectName = ref('');

    function addNewField() {
        const fieldName = newFieldName.value.trim();
        if (!fieldName || !component.value) return;
        componentStore.addInformationField(component.value.id, { fieldName });
        newFieldName.value = '';
    }

    function addNewObject() {
        const objectName = newObjectName.value.trim();
        if (!objectName || !component.value) return;
        componentStore.addInformationObject(component.value.id, { objectName });
        newObjectName.value = '';
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

        <!-- The information the script carries, or the file contains -->
        <section v-collapsible class="detail-section">
            <div class="detail-section-title">
                <span>{{ component.kind === 'script' ? 'Carries' : 'Contains' }}</span>
                <span class="detail-count">{{ informationObjects.length + informationFields.length }}</span>
            </div>

            <div v-if="!informationObjects.length && !informationFields.length" class="detail-empty">
                {{ component.kind === 'script'
                    ? 'Nothing carried yet. Add what the script moves from what it reads to what it writes.'
                    : 'Nothing yet. Add the information stored in this file.' }}
            </div>

            <div class="information-chips">
                <span v-for="informationObject in informationObjects" :key="informationObject.id" class="information-chip object">
                    ▱ {{ informationObject.objectName }}
                    <button type="button" title="Remove" @click="componentStore.removeInformationObject(component.id, informationObject.id)">×</button>
                </span>
                <span v-for="field in informationFields" :key="field.id" class="information-chip">
                    {{ field.fieldName }}
                    <button type="button" title="Remove" @click="componentStore.removeInformationField(component.id, field.id)">×</button>
                </span>
            </div>

            <div class="information-pickers">
                <Select
                    :model-value="undefined"
                    :options="objectOptions"
                    option-label="label"
                    :option-disabled="(option: { id: string }) => component!.informationObjectIds.includes(option.id)"
                    placeholder="+ Object"
                    filter
                    filter-placeholder="Search object"
                    :empty-message="component.kind === 'script' ? 'What the script reads from has no objects' : 'No information objects yet'"
                    size="small"
                    class="detail-prime-select"
                    @change="event => event.value && componentStore.addInformationObject(component!.id, { informationObjectId: event.value.id })"
                />
                <Select
                    :model-value="undefined"
                    :options="fieldOptions"
                    option-label="label"
                    :option-disabled="(option: { id: string }) => component!.informationFieldIds.includes(option.id)"
                    placeholder="+ Field"
                    filter
                    filter-placeholder="Search field"
                    :empty-message="component.kind === 'script' ? 'Add what the script reads from first' : 'No information fields yet'"
                    size="small"
                    class="detail-prime-select"
                    @change="event => event.value && componentStore.addInformationField(component!.id, { informationFieldId: event.value.id })"
                />
            </div>

            <!-- A file can also contain new information -->
            <template v-if="component.kind === 'file'">
                <div class="detail-add-row">
                    <input v-model="newObjectName" type="text" class="detail-input" placeholder="+ New information object" @keyup.enter="addNewObject" />
                    <button type="button" class="detail-add-button" :disabled="!newObjectName.trim()" @click="addNewObject">
                        <i class="pi pi-plus" />
                    </button>
                </div>
                <div class="detail-add-row">
                    <input v-model="newFieldName" type="text" class="detail-input" placeholder="+ New information field" @keyup.enter="addNewField" />
                    <button type="button" class="detail-add-button" :disabled="!newFieldName.trim()" @click="addNewField">
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
