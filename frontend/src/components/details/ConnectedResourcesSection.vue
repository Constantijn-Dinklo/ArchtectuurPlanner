<script setup lang="ts">
    import { computed, onMounted, ref } from 'vue';
    import { Select } from 'primevue';
    import { vCollapsible } from '../../directives/collapsible';
    import { useApiStore } from '../../stores/api.store';
    import { useComponentStore } from '../../stores/resources/component.store';
    import { useTableStore } from '../../stores/resources/table.store';
    import { useConnectionStore } from '../../stores/connection.store';
    import { useResourceService } from '../../services/resources/resource.service';
    import { usePartService } from '../../services/part.service';
    import { useInformationSourceService } from '../../services/informationSource.service';
    import type { PartCreator, PartOption, PartSpec } from '../../services/connectionParts.service';
    import { getConnectionKindInfo } from '../../types/connection.types';
    import { FILE_TYPES, getComponentIcon, type FileType } from '../../types/component.types';
    import type { ConnectionEnd, ConnectionEndTarget, InformationFieldToAdd, InformationObjectToAdd, InformationOption } from '../../types/connectionEnd.types';
    import { RESOURCE_ICONS } from '../../types/resource.type';
    import ExpandableDetailRow from './ExpandableDetailRow.vue';
    import InformationEditor from './InformationEditor.vue';

    // What something is connected to, as a detail section, in three levels:
    // 1. a row per connected resource
    // 2. inside it a row per part: a table of a database, a file of a file location, an api or a way information goes
    // 3. inside a part the information that goes through it
    // It does not know what it is used for: the parent gives the ends, what the parts of a resource are and what
    // information can go on them, and saves what is emitted. An end of the resource itself (no part) only says the two
    // are connected
    const props = withDefaults(defineProps<{
        title: string;
        addPlaceholder: string;
        emptyText: string;
        // Shown on a part without information
        informationEmptyText: string;
        ends: ConnectionEnd[];
        // What the parts of a connected resource are; ends are the parts it has
        getPartSpec: (resourceId: string, ends: ConnectionEnd[]) => PartSpec;
        getFieldOptions: (end: ConnectionEnd) => InformationOption[];
        getObjectOptions: (end: ConnectionEnd) => InformationOption[];
        fieldOptionsEmpty?: string;
        objectOptionsEmpty?: string;
        // Whether new information can be made on a part
        allowNewInformation?: boolean;
        // The resource itself, which cannot be picked
        excludeResourceId?: string;
    }>(), {
        fieldOptionsEmpty: undefined,
        objectOptionsEmpty: undefined,
        allowNewInformation: false,
        excludeResourceId: undefined
    });

    const emit = defineEmits<{
        connect: [target: ConnectionEndTarget];
        // resourceId: the connected resource, with every part of it
        disconnect: [resourceId: string];
        // index: the position of the end in ends
        removeEnd: [index: number];
        addField: [index: number, information: InformationFieldToAdd];
        removeField: [index: number, informationFieldId: string];
        addObject: [index: number, information: InformationObjectToAdd];
        removeObject: [index: number, informationObjectId: string];
    }>();

    const apiStore = useApiStore();
    const componentStore = useComponentStore();
    const tableStore = useTableStore();
    const connectionStore = useConnectionStore();
    const resourceService = useResourceService();
    const partService = usePartService();
    const informationSourceService = useInformationSourceService();

    // Tables are not always loaded on the higher levels of the canvas
    onMounted(() => tableStore.fetchTables());

    // <-- Level 1 and 2: connected resources and their parts -->
    interface Part {
        // The position of the end in ends
        index: number;
        end: ConnectionEnd;
        label: string;
        icon: string;
    }

    interface ConnectedResource {
        id: string;
        label: string;
        icon: string;
        parts: Part[];
        spec: PartSpec;
    }

    // The resource a part belongs to: a table to its database
    function getRowId(end: ConnectionEnd) {
        const resource = resourceService.getResource(end.resourceId);
        return resource?.type === 'table' ? resource.databaseId : end.resourceId;
    }

    // How a part is shown, or undefined for an end of the resource itself
    function describePart(end: ConnectionEnd): Omit<Part, 'index' | 'end'> | undefined {
        const connection = connectionStore.getConnection(end.connectionId);
        // An api connection shows only its url: the icon already says it is an api
        if (connection?.kind === 'api') {
            const url = apiStore.getApi(connection.apiId)?.url ?? 'Unknown API';
            return { label: connection.description ? `${url}: ${connection.description}` : url, icon: getConnectionKindInfo('api').icon };
        }
        if (connection) return { label: informationSourceService.describeConnection(connection), icon: getConnectionKindInfo(connection.kind).icon };
        if (end.apiId) return { label: apiStore.getApi(end.apiId)?.url ?? 'Unknown API', icon: 'pi pi-globe' };
        if (end.componentId) {
            const file = componentStore.getComponent(end.componentId);
            return { label: file?.name ?? 'Unknown file', icon: file ? getComponentIcon(file) : 'pi pi-file' };
        }
        const resource = resourceService.getResource(end.resourceId);
        if (resource?.type === 'table') return { label: resource.name, icon: RESOURCE_ICONS.table };
        return undefined;
    }

    const connectedResources = computed<ConnectedResource[]>(() => {
        const partsById = new Map<string, Part[]>();
        props.ends.forEach((end, index) => {
            const parts = partsById.get(getRowId(end)) ?? [];
            const part = describePart(end);
            if (part) parts.push({ index, end, ...part });
            partsById.set(getRowId(end), parts);
        });

        return [...partsById].map(([id, parts]) => {
            const part = partService.getPart(id);
            return {
                id,
                label: part ? partService.getPartLabel(id) : 'Unknown resource',
                icon: part?.icon ?? 'pi pi-box',
                parts,
                spec: props.getPartSpec(id, parts.map(part => part.end))
            };
        });
    });

    function informationCount(end: ConnectionEnd) {
        return end.informationFieldIds.length + end.informationObjectIds.length;
    }

    function resourceCount(connected: ConnectedResource) {
        return connected.parts.reduce((count, part) => count + informationCount(part.end), 0);
    }

    // <-- Connecting to a resource, or a script -->
    const resourceOptions = computed(() =>
        [
            ...resourceService.getByType(['application', 'external', 'database', 'fileLocation'])
                .map(resource => ({ id: resource.id, label: resource.name })),
            ...partService.getScripts().map(script => ({ id: script.id, label: partService.getPartLabel(script.id) }))
        ]
            .filter(option => option.id !== props.excludeResourceId)
            .sort((a, b) => a.label.localeCompare(b.label))
    );

    // <-- A new part -->
    const newPartNames = ref<Record<string, string>>({});
    const newFileType = ref<FileType>('excel');

    async function createPart(resourceId: string, creator: PartCreator) {
        const name = newPartNames.value[resourceId]?.trim();
        if (!name) return;
        newPartNames.value[resourceId] = '';
        const target = await creator.create(name, newFileType.value);
        if (target) emit('connect', target);
    }
</script>

<template>
    <section v-collapsible class="detail-section">
        <div class="detail-section-title">
            <span>{{ title }}</span>
            <span class="detail-count">{{ connectedResources.length }}</span>
        </div>

        <div v-if="!connectedResources.length" class="detail-empty">{{ emptyText }}</div>

        <!-- 1. A connected resource -->
        <ExpandableDetailRow
            v-for="connected in connectedResources"
            :key="connected.id"
            :icon="connected.icon"
            :label="connected.label"
            :count="resourceCount(connected)"
            remove-title="Remove this connection"
            @remove="emit('disconnect', connected.id)"
        >
            <div v-if="!connected.parts.length" class="detail-empty">{{ connected.spec.emptyText }}</div>

            <!-- 2. A part of it -->
            <ExpandableDetailRow
                v-for="part in connected.parts"
                :key="part.index"
                :icon="part.icon"
                :label="part.label"
                :count="informationCount(part.end)"
                :remove-title="connected.spec.removeTitle"
                @remove="emit('removeEnd', part.index)"
            >
                <!-- E.g. how a connection works, given by the parent -->
                <slot name="part-settings" :end="part.end" />

                <!-- 3. What goes through it -->
                <InformationEditor
                    :information-field-ids="part.end.informationFieldIds"
                    :information-object-ids="part.end.informationObjectIds"
                    :field-options="getFieldOptions(part.end)"
                    :object-options="getObjectOptions(part.end)"
                    :empty-text="informationEmptyText"
                    :field-options-empty="fieldOptionsEmpty"
                    :object-options-empty="objectOptionsEmpty"
                    :allow-new="allowNewInformation"
                    @add-field="information => emit('addField', part.index, information)"
                    @remove-field="id => emit('removeField', part.index, id)"
                    @add-object="information => emit('addObject', part.index, information)"
                    @remove-object="id => emit('removeObject', part.index, id)"
                />
            </ExpandableDetailRow>

            <!-- Picking another part, with one or more dropdowns side by side -->
            <div class="part-pickers">
                <Select
                    v-for="picker in connected.spec.pickers"
                    :key="picker.placeholder"
                    :model-value="undefined"
                    :options="picker.options"
                    option-label="label"
                    option-disabled="disabled"
                    :placeholder="picker.placeholder"
                    :filter="!!picker.filterPlaceholder"
                    :filter-placeholder="picker.filterPlaceholder"
                    :empty-message="picker.emptyMessage"
                    size="small"
                    class="detail-prime-select"
                    @change="event => event.value && emit('connect', (event.value as PartOption).target)"
                />
            </div>

            <!-- Making a new part -->
            <div v-if="connected.spec.creator" class="detail-add-row">
                <input
                    v-model="newPartNames[connected.id]"
                    type="text"
                    class="detail-input"
                    :placeholder="connected.spec.creator.placeholder"
                    @keyup.enter="createPart(connected.id, connected.spec.creator)"
                />
                <select
                    v-if="connected.spec.creator.withFileType"
                    v-model="newFileType"
                    class="detail-select file-type-select"
                    title="File type"
                >
                    <option v-for="option in FILE_TYPES" :key="option.fileType" :value="option.fileType">
                        {{ option.label }}
                    </option>
                </select>
                <button
                    type="button"
                    class="detail-add-button"
                    :title="connected.spec.creator.title"
                    :disabled="!newPartNames[connected.id]?.trim()"
                    @click="createPart(connected.id, connected.spec.creator)"
                >
                    <i class="pi pi-plus" />
                </button>
            </div>
        </ExpandableDetailRow>

        <Select
            :model-value="undefined"
            :options="resourceOptions"
            option-label="label"
            :option-disabled="(option: InformationOption) => connectedResources.some(connected => connected.id === option.id)"
            :placeholder="addPlaceholder"
            filter
            filter-placeholder="Search resource"
            size="small"
            class="detail-prime-select"
            @change="event => event.value && emit('connect', { resourceId: event.value.id, componentId: null })"
        />
    </section>
</template>

<style scoped>
.file-type-select {
    flex: 0 0 auto;
    width: auto;
}

/* Side by side, like the object and field pickers */
.part-pickers {
    display: flex;
    gap: 4px;
}

.part-pickers :deep(.detail-prime-select.p-select) {
    flex: 1;
    min-width: 0;
}
</style>
