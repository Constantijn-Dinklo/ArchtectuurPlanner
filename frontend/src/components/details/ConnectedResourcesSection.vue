<script setup lang="ts">
    import { computed, onMounted, ref } from 'vue';
    import { Select } from 'primevue';
    import { vCollapsible } from '../../directives/collapsible';
    import { useComponentStore } from '../../stores/resources/component.store';
    import { useTableStore } from '../../stores/resources/table.store';
    import { useResourceService } from '../../services/resources/resource.service';
    import { useTableService } from '../../services/resources/table.service';
    import { FILE_TYPES, getComponentIcon, type FileType } from '../../types/component.types';
    import type { ConnectionEnd, ConnectionEndTarget, InformationFieldToAdd, InformationObjectToAdd, InformationOption } from '../../types/connectionEnd.types';
    import type { ResourceType } from '../../types/resource.type';
    import ExpandableDetailRow from './ExpandableDetailRow.vue';
    import InformationEditor from './InformationEditor.vue';

    // What something reads from or writes to, as a detail section. It does not know what it is used for:
    // the parent gives the ends and what information can go on them, and saves what is emitted.
    // - an application or external element gets its information directly
    // - a database has its information per table, a file location per file. Both can also be connected without one
    const props = withDefaults(defineProps<{
        title: string;
        addPlaceholder: string;
        emptyText: string;
        // Shown on an end without information
        informationEmptyText: string;
        ends: ConnectionEnd[];
        getFieldOptions: (end: ConnectionEnd) => InformationOption[];
        getObjectOptions: (end: ConnectionEnd) => InformationOption[];
        fieldOptionsEmpty?: string;
        objectOptionsEmpty?: string;
        // Whether new information can be made on an end
        allowNewInformation?: boolean;
    }>(), {
        fieldOptionsEmpty: undefined,
        objectOptionsEmpty: undefined,
        allowNewInformation: false
    });

    const emit = defineEmits<{
        connect: [target: ConnectionEndTarget];
        // connectionId: the resource, with every table or file of it
        disconnect: [connectionId: string];
        // index: the position of the end in ends
        removeEnd: [index: number];
        addField: [index: number, information: InformationFieldToAdd];
        removeField: [index: number, informationFieldId: string];
        addObject: [index: number, information: InformationObjectToAdd];
        removeObject: [index: number, informationObjectId: string];
    }>();

    const componentStore = useComponentStore();
    const tableStore = useTableStore();
    const tableService = useTableService();
    const resourceService = useResourceService();

    // Tables are not always loaded on the higher levels of the canvas
    onMounted(() => tableStore.fetchTables());

    const RESOURCE_ICONS: Record<ResourceType, string> = {
        application: 'pi pi-desktop',
        database: 'pi pi-database',
        table: 'pi pi-table',
        fileLocation: 'pi pi-folder',
        server: 'pi pi-server',
        external: 'pi pi-globe'
    };

    // What a resource holds its information in, when it does not hold it directly
    const PART_NOUNS: Partial<Record<ResourceType, 'table' | 'file'>> = {
        database: 'table',
        fileLocation: 'file'
    };

    function endKey(end: ConnectionEndTarget) {
        return `${end.resourceId}:${end.componentId ?? ''}`;
    }

    function informationCount(end: ConnectionEnd) {
        return end.informationFieldIds.length + end.informationObjectIds.length;
    }

    interface PositionedEnd {
        index: number;
        end: ConnectionEnd;
    }

    // A known table or file of a connection
    interface ConnectionPart extends PositionedEnd {
        label: string;
        icon: string;
    }

    // Everything that goes to one resource
    interface Connection {
        id: string;
        label: string;
        icon: string;
        partNoun?: 'table' | 'file';
        parts: ConnectionPart[];
        // The end of the resource itself
        own?: PositionedEnd;
    }

    function getConnection(connections: Map<string, Connection>, id: string) {
        const existing = connections.get(id);
        if (existing) return existing;

        const resource = resourceService.getResource(id);
        const connection: Connection = {
            id,
            label: resource?.name ?? 'Unknown resource',
            icon: resource ? RESOURCE_ICONS[resource.type] : 'pi pi-box',
            partNoun: resource ? PART_NOUNS[resource.type] : undefined,
            parts: []
        };
        connections.set(id, connection);
        return connection;
    }

    const connections = computed(() => {
        const result = new Map<string, Connection>();

        props.ends.forEach((end, index) => {
            const resource = resourceService.getResource(end.resourceId);
            if (end.componentId) {
                const file = componentStore.getComponent(end.componentId);
                getConnection(result, end.resourceId).parts.push({
                    index,
                    end,
                    label: file?.name ?? 'Unknown file',
                    icon: file ? getComponentIcon(file) : 'pi pi-file'
                });
            } else if (resource?.type === 'table') {
                getConnection(result, resource.databaseId).parts.push({ index, end, label: resource.name, icon: RESOURCE_ICONS.table });
            } else {
                getConnection(result, end.resourceId).own = { index, end };
            }
        });

        return [...result.values()];
    });

    function connectionCount(connection: Connection) {
        return connection.parts.reduce((count, part) => count + informationCount(part.end), connection.own ? informationCount(connection.own.end) : 0);
    }

    // <-- Connecting to a resource -->
    const resourceOptions = computed(() =>
        resourceService.getByType(['application', 'external', 'database', 'fileLocation'])
            .map(resource => ({ id: resource.id, label: resource.name }))
            .sort((a, b) => a.label.localeCompare(b.label))
    );

    // <-- The tables and files of a connection -->
    interface PartOption {
        key: string;
        target: ConnectionEndTarget;
        label: string;
    }

    function getPartOptions(connection: Connection): PartOption[] {
        const targets = connection.partNoun === 'table'
            ? tableStore.getTables(connection.id).map(table => ({ target: { resourceId: table.id, componentId: null }, label: table.name }))
            : componentStore.getResourceComponents(connection.id)
                .filter(component => component.kind === 'file')
                .map(file => ({ target: { resourceId: connection.id, componentId: file.id }, label: file.name }));

        return targets
            .map(option => ({ ...option, key: endKey(option.target) }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }

    function isPartConnected(connection: Connection, option: PartOption) {
        return connection.parts.some(part => endKey(part.end) === option.key);
    }

    const newPartNames = ref<Record<string, string>>({});
    const newFileType = ref<FileType>('excel');

    async function addNewPart(connection: Connection) {
        const name = newPartNames.value[connection.id]?.trim();
        if (!name) return;
        newPartNames.value[connection.id] = '';

        if (connection.partNoun === 'table') {
            emit('connect', { resourceId: await tableService.createTable(name, connection.id), componentId: null });
            return;
        }
        const file = await componentStore.createComponent(connection.id, 'file', name, newFileType.value);
        if (file) emit('connect', { resourceId: connection.id, componentId: file.id });
    }
</script>

<template>
    <section v-collapsible class="detail-section">
        <div class="detail-section-title">
            <span>{{ title }}</span>
            <span class="detail-count">{{ connections.length }}</span>
        </div>

        <div v-if="!connections.length" class="detail-empty">{{ emptyText }}</div>

        <ExpandableDetailRow
            v-for="connection in connections"
            :key="connection.id"
            :icon="connection.icon"
            :label="connection.label"
            :count="connectionCount(connection)"
            remove-title="Remove this connection"
            @remove="emit('disconnect', connection.id)"
        >
            <!-- An application or external element: its information directly -->
            <InformationEditor
                v-if="!connection.partNoun && connection.own"
                :information-field-ids="connection.own.end.informationFieldIds"
                :information-object-ids="connection.own.end.informationObjectIds"
                :field-options="getFieldOptions(connection.own.end)"
                :object-options="getObjectOptions(connection.own.end)"
                :empty-text="informationEmptyText"
                :field-options-empty="fieldOptionsEmpty"
                :object-options-empty="objectOptionsEmpty"
                :allow-new="allowNewInformation"
                @add-field="information => emit('addField', connection.own!.index, information)"
                @remove-field="id => emit('removeField', connection.own!.index, id)"
                @add-object="information => emit('addObject', connection.own!.index, information)"
                @remove-object="id => emit('removeObject', connection.own!.index, id)"
            />

            <!-- A database or file location: first a table or file, the information goes on that -->
            <template v-else-if="connection.partNoun">
                <!-- Information that was put on the database or file location itself before it had to go on a table or file -->
                <InformationEditor
                    v-if="connection.own && informationCount(connection.own.end)"
                    :information-field-ids="connection.own.end.informationFieldIds"
                    :information-object-ids="connection.own.end.informationObjectIds"
                    empty-text=""
                    chips-only
                    @remove-field="id => emit('removeField', connection.own!.index, id)"
                    @remove-object="id => emit('removeObject', connection.own!.index, id)"
                />

                <div v-if="!connection.parts.length" class="detail-empty">
                    No {{ connection.partNoun }} chosen yet
                </div>

                <ExpandableDetailRow
                    v-for="part in connection.parts"
                    :key="endKey(part.end)"
                    :icon="part.icon"
                    :label="part.label"
                    :count="informationCount(part.end)"
                    :remove-title="`Remove this ${connection.partNoun}`"
                    @remove="emit('removeEnd', part.index)"
                >
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

                <Select
                    :model-value="undefined"
                    :options="getPartOptions(connection)"
                    option-label="label"
                    :option-disabled="(option: PartOption) => isPartConnected(connection, option)"
                    :placeholder="`+ Choose a ${connection.partNoun}…`"
                    filter
                    :filter-placeholder="`Search ${connection.partNoun}`"
                    :empty-message="`No ${connection.partNoun}s yet`"
                    size="small"
                    class="detail-prime-select"
                    @change="event => event.value && emit('connect', event.value.target)"
                />

                <div class="detail-add-row">
                    <input
                        v-model="newPartNames[connection.id]"
                        type="text"
                        class="detail-input"
                        :placeholder="`+ New ${connection.partNoun}`"
                        @keyup.enter="addNewPart(connection)"
                    />
                    <select
                        v-if="connection.partNoun === 'file'"
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
                        :title="`Add ${connection.partNoun}`"
                        :disabled="!newPartNames[connection.id]?.trim()"
                        @click="addNewPart(connection)"
                    >
                        <i class="pi pi-plus" />
                    </button>
                </div>
            </template>
        </ExpandableDetailRow>

        <Select
            :model-value="undefined"
            :options="resourceOptions"
            option-label="label"
            :option-disabled="(option: InformationOption) => connections.some(connection => connection.id === option.id)"
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
</style>
