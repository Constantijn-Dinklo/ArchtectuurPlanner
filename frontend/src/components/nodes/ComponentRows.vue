<script setup lang="ts">
    import { ref } from 'vue';
    import { Handle, Position } from '@vue-flow/core';
    import { useUIStore } from '../../stores/canvas/ui.store';
    import { getComponentHandleId, type CanvasComponentRow } from '../../types/component.types';

    // The components of a resource (its scripts and files) as thin rows inside the node of the resource.
    // Every row has its own handles, so edges go to and from the component itself
    defineProps<{
        components: CanvasComponentRow[];
    }>();

    const UIStore = useUIStore();

    function isSelected(component: CanvasComponentRow) {
        return UIStore.selectedEntityType === 'node' && !!component.viewNodeId && UIStore.selectedEntityId === component.viewNodeId;
    }

    // Opens the details of the component in the details panel
    function selectComponent(component: CanvasComponentRow) {
        if (component.viewNodeId) UIStore.setSelectedEntity(component.viewNodeId, 'node');
    }

    // The opened information objects in the inputs and outputs of scripts, keyed by component, side and object
    const expandedObjects = ref<Set<string>>(new Set());

    function toggleObject(key: string) {
        const expanded = new Set(expandedObjects.value);
        if (expanded.has(key)) {
            expanded.delete(key);
        } else {
            expanded.add(key);
        }
        expandedObjects.value = expanded;
    }

    function getIncomingTitle(component: CanvasComponentRow) {
        return component.kind === 'script' ? 'Reads from' : 'Written by';
    }

    function getOutgoingTitle(component: CanvasComponentRow) {
        return component.kind === 'script' ? 'Writes to' : 'Read by';
    }
</script>

<template>
    <div class="components-section">
        <div class="components-title">
            <span class="components-dot" />
            Components
        </div>

        <div
            v-for="component in components"
            :key="component.id"
            class="component"
            :class="[component.kind, {
                selected: isSelected(component),
                'search-match': component.searchMatch === true,
                'search-dimmed': component.searchMatch === false
            }]"
        >
            <div
                class="component-row nodrag"
                :title="component.kind === 'script' ? 'Script' : 'File'"
                @click.stop="UIStore.toggleComponentExpanded(component.id)"
            >
                <!-- Edges to and from the component attach here: incoming on the left, outgoing on the right -->
                <Handle
                    :id="getComponentHandleId(component.id, 'in')"
                    type="target"
                    :position="Position.Left"
                    :connectable="false"
                    class="component-handle"
                />

                <span class="expand-icon" :class="{ expanded: UIStore.expandedComponentIds.has(component.id) }">
                    <svg viewBox="0 0 8 8" aria-hidden="true">
                        <path d="M3 1.5 5.5 4 3 6.5" />
                    </svg>
                </span>
                <i :class="component.icon" class="component-icon" />
                <span class="component-name">{{ component.name }}</span>
                <span
                    class="component-flow"
                    :title="`${getIncomingTitle(component)}: ${component.incoming.length} · ${getOutgoingTitle(component)}: ${component.outgoing.length}`"
                >
                    {{ component.incoming.length }}→{{ component.outgoing.length }}
                </span>
                <button
                    type="button"
                    class="component-open"
                    title="Open the details"
                    @click.stop="selectComponent(component)"
                >
                    <i class="pi pi-arrow-up-right" />
                </button>

                <Handle
                    :id="getComponentHandleId(component.id, 'out')"
                    type="source"
                    :position="Position.Right"
                    :connectable="false"
                    class="component-handle"
                />
            </div>

            <!-- Script: what it takes in and what it produces, like the inputs and outputs of an application -->
            <div
                v-if="UIStore.expandedComponentIds.has(component.id) && component.kind === 'script'"
                class="script-information"
            >
                <div
                    v-for="side in (['inputs', 'outputs'] as const)"
                    :key="side"
                    class="information-column"
                    :class="side"
                >
                    <div class="information-title">
                        <span class="title-dot" />
                        {{ side === 'inputs' ? 'Inputs' : 'Outputs' }}
                    </div>

                    <div
                        v-for="informationObject in component[side]?.objects ?? []"
                        :key="informationObject.id"
                        class="information-object"
                    >
                        <div
                            class="information-object-row nodrag"
                            @click.stop="toggleObject(`${component.id}:${side}:${informationObject.id}`)"
                        >
                            <span
                                class="expand-icon"
                                :class="{ expanded: expandedObjects.has(`${component.id}:${side}:${informationObject.id}`) }"
                            >
                                <svg viewBox="0 0 8 8" aria-hidden="true">
                                    <path d="M3 1.5 5.5 4 3 6.5" />
                                </svg>
                            </span>
                            <span class="information-object-name">{{ informationObject.name }}</span>
                            <span class="object-field-count">{{ informationObject.fieldNames.length }}</span>
                        </div>
                        <ul
                            v-if="expandedObjects.has(`${component.id}:${side}:${informationObject.id}`)"
                            class="object-information-fields"
                        >
                            <li v-for="fieldName in informationObject.fieldNames" :key="fieldName">{{ fieldName }}</li>
                        </ul>
                    </div>

                    <ul class="information-fields-list">
                        <li v-for="fieldName in component[side]?.fieldNames ?? []" :key="fieldName">{{ fieldName }}</li>
                    </ul>

                    <div
                        v-if="!component[side]?.objects.length && !component[side]?.fieldNames.length"
                        class="component-empty"
                    >
                        Nothing
                    </div>
                </div>
            </div>

            <!-- File: the scripts that write to it and read from it, and what it contains -->
            <div v-else-if="UIStore.expandedComponentIds.has(component.id)" class="component-details">
                <div class="component-details-title">{{ getIncomingTitle(component) }}</div>
                <ul class="component-list">
                    <li v-for="link in component.incoming" :key="link.key">
                        <i :class="link.icon" /> {{ link.name }}
                    </li>
                    <li v-if="!component.incoming.length" class="component-empty">Nothing</li>
                </ul>

                <div class="component-details-title">{{ getOutgoingTitle(component) }}</div>
                <ul class="component-list">
                    <li v-for="link in component.outgoing" :key="link.key">
                        <i :class="link.icon" /> {{ link.name }}
                    </li>
                    <li v-if="!component.outgoing.length" class="component-empty">Nothing</li>
                </ul>

                <div class="component-details-title">Contains</div>
                <ul class="component-list information">
                    <li v-for="objectName in component.objectNames" :key="`object:${objectName}`" class="information-object">
                        ▱ {{ objectName }}
                    </li>
                    <li v-for="fieldName in component.fieldNames" :key="`field:${fieldName}`">
                        {{ fieldName }}
                    </li>
                    <li v-if="!component.objectNames.length && !component.fieldNames.length" class="component-empty">
                        No information
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<style scoped>
.components-section {
    padding: 3px 4px 4px;
    border-top: 1px solid #eef2f7;

    font-size: var(--canvas-type-detail-text);
    line-height: 1.2;
}

.components-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    margin-bottom: 3px;

    color: #64748b;
    font-size: var(--canvas-type-detail-meta);
    font-weight: 700;
    letter-spacing: 0.08em;
    line-height: 1.2;
    text-transform: uppercase;
}

.components-dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: #4f46e5;
}

.component {
    min-width: 0;
    margin-bottom: 2px;

    border: 1px solid #c7d2fe;
    border-radius: 3px;
    background: #f5f7ff;
}

.component.file {
    border-color: #fed7aa;
    background: #fffaf5;
}

.component.selected {
    border-color: #4f46e5;
    box-shadow: 0 0 0 1px rgba(79, 70, 229, 0.25);
}

/* Searching for information: the components that use it stand out, the others fade */
.component.search-match {
    outline: 1px solid var(--p-primary-color);
    outline-offset: 1px;
}

.component.search-dimmed {
    opacity: 0.4;
}

.component.file.selected {
    border-color: #ea580c;
    box-shadow: 0 0 0 1px rgba(234, 88, 12, 0.25);
}

.component-row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 2px;
    min-width: 0;
    padding: 1.5px 2px;

    border-radius: 3px;
    cursor: pointer;
}

.component-row:hover {
    background: #e0e7ff;
}

.component.file .component-row:hover {
    background: #ffedd5;
}

/* The handles sit on the border of the resource node: past the padding of the section and the border of the row */
.component-handle {
    width: 3px;
    height: 3px;
    min-width: 0;
    min-height: 0;
    border: none;
    background: #a5b4fc;
}

.component-handle.vue-flow__handle-left {
    left: -5px;
}

.component-handle.vue-flow__handle-right {
    right: -5px;
    left: auto;
    transform: translate(50%, -50%);
}

.component.file .component-handle {
    background: #fdba74;
}

.expand-icon {
    display: inline-flex;
    flex: 0 0 5px;
    width: 5px;
    height: 5px;

    transition: transform 0.15s ease;
}

.expand-icon.expanded {
    transform: rotate(90deg);
}

.expand-icon svg {
    width: 100%;
    height: 100%;
    fill: none;
    stroke: #4f46e5;
    stroke-width: 1.4;
}

.component.file .expand-icon svg {
    stroke: #ea580c;
}

.component-icon {
    flex: 0 0 auto;
    color: #4f46e5;
    font-size: var(--canvas-type-detail-meta);
}

.component.file .component-icon {
    color: #ea580c;
}

.component-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;

    color: #3730a3;
    font-weight: 700;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.component.file .component-name {
    color: #9a3412;
}

.component-flow {
    flex: 0 0 auto;
    padding: 0 2px;
    border-radius: 999px;

    background: #e0e7ff;
    color: #4f46e5;
    font-size: var(--canvas-type-detail-meta);
    font-weight: 600;
}

.component.file .component-flow {
    background: #ffedd5;
    color: #c2410c;
}

.component-open {
    display: inline-flex;
    flex: 0 0 auto;
    padding: 0;

    border: none;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
}

.component-open .pi {
    font-size: var(--canvas-type-detail-meta);
}

.component-open:hover {
    color: #1e293b;
}

.component-details {
    padding: 0 2px 2px 6px;
}

.component-details-title {
    margin-top: 2px;

    color: #64748b;
    font-size: var(--canvas-type-detail-meta);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.component-list {
    margin: 0;
    padding: 0;
    list-style: none;
}

.component-list li {
    overflow: hidden;
    padding: 1px 2px 1px 3px;

    border-left: 1px solid #c7d2fe;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.component.file .component-list li {
    border-left-color: #fed7aa;
}

.component-list li .pi {
    color: #64748b;
    font-size: var(--canvas-type-detail-meta);
}

.component-list .information-object {
    font-weight: 700;
}

.component-list li.component-empty,
.component-empty {
    color: #94a3b8;
    font-style: italic;
}

/* Script: inputs and outputs side by side, like in the application node */

.script-information {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    padding: 2px 3px 3px;
    border-top: 1px solid #e0e7ff;
    background: #ffffff;
    border-radius: 0 0 3px 3px;
}

.information-column {
    min-width: 0;
}

.information-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    margin-bottom: 2px;

    color: #64748b;
    font-size: var(--canvas-type-detail-meta);
    font-weight: 700;
    letter-spacing: 0.08em;
    line-height: 1.2;
    text-transform: uppercase;
}

.title-dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: #3b82f6;
}

.information-column.outputs .title-dot {
    background: #f59e0b;
}

.information-object {
    min-width: 0;
    margin-bottom: 2px;

    border: 1px solid #e0e7ff;
    border-radius: 3px;
    background: #f8faff;
}

.information-object-row {
    display: flex;
    align-items: center;
    gap: 2px;
    min-width: 0;
    padding: 1px 2px;
    cursor: pointer;
}

.information-object-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;

    color: #3730a3;
    font-weight: 700;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.object-field-count {
    flex: 0 0 auto;
    padding: 0 2px;
    border-radius: 999px;

    background: #e0e7ff;
    color: #4f46e5;
    font-size: var(--canvas-type-detail-meta);
    font-weight: 600;
}

.information-fields-list,
.object-information-fields {
    margin: 0;
    padding: 0;
    list-style: none;
}

.information-fields-list li,
.object-information-fields li {
    overflow: hidden;
    padding: 1px 2px;
    line-height: 1.2;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.information-fields-list li::before {
    content: '';
    display: inline-block;
    width: 2px;
    height: 2px;
    margin-right: 2px;
    border-radius: 50%;
    background: #94a3b8;
    vertical-align: middle;
}

.object-information-fields {
    padding: 0 2px 2px 6px;
}

.object-information-fields li {
    padding-left: 3px;
    border-left: 1px solid #c7d2fe;
}
</style>
