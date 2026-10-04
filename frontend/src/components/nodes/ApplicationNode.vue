<script lang="ts">
    import { ref } from 'vue';
    import type { FieldApplicationOrigin } from '../../services/informationObject.service';

    interface DraggedInformationField {
        informationFieldId: string;
        fromInformationObjectId?: string;
        fromNodeResourceId: string;
        fromApplication?: FieldApplicationOrigin;
    }

    // Shared between all ApplicationNodes, so a field can be dragged from one node to another
    const draggedInformationField = ref<DraggedInformationField>();
</script>

<script setup lang="ts">
    import { Handle, Position, type NodeProps } from '@vue-flow/core';
    import type { ApplicationNodeData } from '../../types/application.types';
    import { useInformationObjectService } from '../../services/informationObject.service';
import { useInformationEndpointService } from '../../services/informationEndpoint.service';
import { useInformationTransferService } from '../../services/informationTransfer.service';
import { useResourceService } from '../../services/resources/resource.service';

    const props = defineProps<NodeProps<ApplicationNodeData>>();

    const informationObjectService = useInformationObjectService();
    const informationEndpointService = useInformationEndpointService();
    const informationTransferService = useInformationTransferService();
    const resourceService = useResourceService();

    // Returns a warning when the input comes from another application without an api url that sends it
    function getUnsentFieldWarning(informationFieldId: string) {
        const sourceId = informationTransferService.getUnsentInputFieldSource(props.data.resourceId, informationFieldId);
        if (!sourceId) return undefined;
        return `Sent from ${resourceService.getResource(sourceId)?.name ?? 'another application'} without an API url or human connection that carries it`;
    }

    function getUnsentObjectWarning(informationObjectId: string) {
        const sourceId = informationTransferService.getUnsentInputObjectSource(props.data.resourceId, informationObjectId);
        if (!sourceId) return undefined;
        return `Sent from ${resourceService.getResource(sourceId)?.name ?? 'another application'} without an API url or human connection that carries it`;
    }

    const nodeElement = ref<HTMLElement>();

    const dragOverInformationObjectId = ref<string>();

    function onFieldDragStart(event: DragEvent, informationFieldId: string, fromInformationObjectId?: string) {
        draggedInformationField.value = {
            informationFieldId,
            fromInformationObjectId,
            fromNodeResourceId: props.data.resourceId
        };

        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', informationFieldId);
        }
    }

    function onStandaloneFieldDragStart(event: DragEvent, informationFieldId: string, direction: 'input' | 'output') {
        onFieldDragStart(event, informationFieldId);

        draggedInformationField.value = {
            informationFieldId,
            fromNodeResourceId: props.data.resourceId,
            fromApplication: {
                applicationId: props.data.resourceId,
                direction
            }
        };
    }

    function onFieldDragEnd() {
        draggedInformationField.value = undefined;
        dragOverInformationObjectId.value = undefined;
    }

    function onInformationObjectDragOver(event: DragEvent, informationObjectId: string) {
        const dragged = draggedInformationField.value;
        if (!dragged || dragged.fromInformationObjectId === informationObjectId) return;

        event.preventDefault();
        dragOverInformationObjectId.value = informationObjectId;
    }

    function onInformationObjectDragLeave(event: DragEvent) {
        const currentTarget = event.currentTarget as HTMLElement;
        if (currentTarget.contains(event.relatedTarget as Node | null)) return;

        dragOverInformationObjectId.value = undefined;
    }

    function onInformationObjectDrop(informationObjectId: string) {
        const dragged = draggedInformationField.value;
        onFieldDragEnd();
        if (!dragged) return;

        informationObjectService.moveInformationFieldToInformationObject(
            dragged.informationFieldId,
            dragged.fromInformationObjectId,
            informationObjectId,
            dragged.fromApplication
        );
    }

    function isDraggedFromObjectInThisNode() {
        const dragged = draggedInformationField.value;
        return !!dragged?.fromInformationObjectId && dragged.fromNodeResourceId === props.data.resourceId;
    }

    // Dropping a field inside the node, but outside of any InformationObject,
    // moves it from the object it came from to the standalone list of that column
    function onColumnDragOver(event: DragEvent) {
        if (!isDraggedFromObjectInThisNode()) return;

        event.preventDefault();
    }

    function onColumnDrop(direction: 'input' | 'output') {
        const dragged = draggedInformationField.value;
        const fromThisNode = isDraggedFromObjectInThisNode();
        onFieldDragEnd();
        if (!dragged || !fromThisNode) return;

        informationObjectService.moveInformationFieldToInformationObject(
            dragged.informationFieldId,
            dragged.fromInformationObjectId,
            undefined,
            undefined,
            {
                applicationId: props.data.resourceId,
                direction
            }
        );
    }

    // When no drop handler picked the field up and it was released outside of the node,
    // the field is removed from the object without putting it back in the standalone list
    function onObjectFieldDragEnd(event: DragEvent) {
        const dragged = draggedInformationField.value;
        onFieldDragEnd();
        if (!dragged?.fromInformationObjectId || !nodeElement.value) return;

        const rect = nodeElement.value.getBoundingClientRect();
        const isInsideNode =
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom;
        if (isInsideNode) return;

        informationObjectService.deleteInformationFieldFromInformationObject(
            dragged.fromInformationObjectId,
            dragged.informationFieldId
        );
    }

    const expandedInformationObjects = ref<Set<string>>(new Set());

    function toggleInformationObject(informationObjectId: string) {
        const expanded = new Set(expandedInformationObjects.value);

        if (expanded.has(informationObjectId)) {
            expanded.delete(informationObjectId);
        } else {
            expanded.add(informationObjectId);
        }

        expandedInformationObjects.value = expanded;
    }

    function isInformationObjectExpanded(informationObjectId: string) {
        return expandedInformationObjects.value.has(informationObjectId);
    }
</script>

<template>
    <div ref="nodeElement" class="application-node">
        <!-- Top connection point -->
        <Handle
            type="target"
            :position="Position.Top"
        />

        <header
            class="application-header"
            :class="{
                'has-information':
                    props.data.inputInformationFields ||
                    props.data.outputInformationFields ||
                    props.data.inputInformationObjects ||
                    props.data.outputInformationObjects
            }"
        >
            <span class="application-icon">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                    <rect x="2" y="2.5" width="12" height="11" rx="2" />
                    <path d="M2 5.5h12" />
                    <circle cx="4" cy="4" r="0.4" />
                    <circle cx="5.5" cy="4" r="0.4" />
                </svg>
            </span>

            <span class="application-name">
                {{ props.data.label }}
            </span>
        </header>

        <div
            v-if="
                props.data.inputInformationFields ||
                props.data.outputInformationFields ||
                props.data.inputInformationObjects ||
                props.data.outputInformationObjects
            "
            class="information-container"
        >
            <!-- INPUT -->
            <div
                class="information-column"
                @dragover="onColumnDragOver"
                @drop.prevent="onColumnDrop('input')"
            >
                <div class="information-title">
                    <span class="title-dot" />
                    Inputs
                </div>

                <!-- Input information objects -->
                <div
                    v-for="informationObject in props.data.inputInformationObjects"
                    :key="informationObject.informationObject.id"
                    class="information-object"
                    :class="{
                        'drop-target': dragOverInformationObjectId === informationObject.informationObject.id,
                        'not-sent': getUnsentObjectWarning(informationObject.informationObject.id)
                    }"
                    :title="getUnsentObjectWarning(informationObject.informationObject.id)"
                    @dragover="onInformationObjectDragOver($event, informationObject.informationObject.id)"
                    @dragleave="onInformationObjectDragLeave"
                    @drop.prevent.stop="onInformationObjectDrop(informationObject.informationObject.id)"
                >
                    <div
                        class="information-object-row"
                        @click.stop="toggleInformationObject(informationObject.informationObject.id)"
                    >
                        <span
                            class="expand-icon"
                            :class="{ expanded: isInformationObjectExpanded(informationObject.informationObject.id) }"
                        >
                            <svg viewBox="0 0 8 8" aria-hidden="true">
                                <path d="M3 1.5 5.5 4 3 6.5" />
                            </svg>
                        </span>

                        <span class="information-object-name">
                            {{ informationObject.informationObject.objectName }}
                        </span>

                        <span class="object-field-count">
                            {{ informationObject.informationObject.informationFields.length }}
                        </span>
                    </div>

                    <ul
                        v-if="isInformationObjectExpanded(informationObject.informationObject.id)"
                        class="object-information-fields"
                    >
                        <li
                            v-for="informationField in informationObject.informationObject.informationFields"
                            :key="informationField.id"
                            class="nodrag"
                            draggable="true"
                            @dragstart.stop="onFieldDragStart($event, informationField.id, informationObject.informationObject.id)"
                            @dragend="onObjectFieldDragEnd"
                        >
                            {{ informationField.fieldName }}
                        </li>
                    </ul>
                </div>

                <!-- Individual input fields -->
                <ul class="information-fields-list">
                    <li
                        v-for="informationField in props.data.inputInformationFields"
                        :key="informationField.informationField.id"
                        class="nodrag"
                        :class="{ 'not-sent': getUnsentFieldWarning(informationField.informationField.id) }"
                        :title="getUnsentFieldWarning(informationField.informationField.id)"
                        draggable="true"
                        @dragstart.stop="onStandaloneFieldDragStart($event, informationField.informationField.id, 'input')"
                        @dragend="onFieldDragEnd"
                    >
                        {{ informationField.informationField.fieldName }}
                    </li>
                </ul>
            </div>

            <!-- OUTPUT -->
            <div
                class="information-column output-column"
                @dragover="onColumnDragOver"
                @drop.prevent="onColumnDrop('output')"
            >
                <div class="information-title">
                    <span class="title-dot" />
                    Outputs
                </div>

                <!-- Output information objects -->
                <div
                    v-for="informationObject in props.data.outputInformationObjects"
                    :key="informationObject.informationObject.id"
                    class="information-object"
                    :class="{
                        'drop-target': dragOverInformationObjectId === informationObject.informationObject.id,
                        unused: informationEndpointService.isUnusedOutputObject(props.data.resourceId, informationObject.informationObject.id)
                    }"
                    :title="informationEndpointService.isUnusedOutputObject(props.data.resourceId, informationObject.informationObject.id)
                        ? 'Not used by any other resource'
                        : undefined"
                    @dragover="onInformationObjectDragOver($event, informationObject.informationObject.id)"
                    @dragleave="onInformationObjectDragLeave"
                    @drop.prevent.stop="onInformationObjectDrop(informationObject.informationObject.id)"
                >
                    <div
                        class="information-object-row"
                        @click.stop="toggleInformationObject(informationObject.informationObject.id)"
                    >
                        <span
                            class="expand-icon"
                            :class="{ expanded: isInformationObjectExpanded(informationObject.informationObject.id) }"
                        >
                            <svg viewBox="0 0 8 8" aria-hidden="true">
                                <path d="M3 1.5 5.5 4 3 6.5" />
                            </svg>
                        </span>

                        <span class="information-object-name">
                            {{ informationObject.informationObject.objectName }}
                        </span>

                        <span class="object-field-count">
                            {{ informationObject.informationObject.informationFields.length }}
                        </span>
                    </div>

                    <ul
                        v-if="isInformationObjectExpanded(informationObject.informationObject.id)"
                        class="object-information-fields"
                    >
                        <li
                            v-for="informationField in informationObject.informationObject.informationFields"
                            :key="informationField.id"
                            class="nodrag"
                            draggable="true"
                            @dragstart.stop="onFieldDragStart($event, informationField.id, informationObject.informationObject.id)"
                            @dragend="onObjectFieldDragEnd"
                        >
                            {{ informationField.fieldName }}
                        </li>
                    </ul>
                </div>

                <!-- Individual output fields -->
                <ul class="information-fields-list">
                    <li
                        v-for="informationField in props.data.outputInformationFields"
                        :key="informationField.informationField.id"
                        class="nodrag"
                        :class="{ unused: informationEndpointService.isUnusedOutputField(props.data.resourceId, informationField.informationField.id) }"
                        :title="informationEndpointService.isUnusedOutputField(props.data.resourceId, informationField.informationField.id)
                            ? 'Not used by any other resource'
                            : undefined"
                        draggable="true"
                        @dragstart.stop="onStandaloneFieldDragStart($event, informationField.informationField.id, 'output')"
                        @dragend="onFieldDragEnd"
                    >
                        {{ informationField.informationField.fieldName }}
                    </li>
                </ul>
            </div>
        </div>

        <!-- Bottom connection point -->
        <Handle
            type="source"
            :position="Position.Bottom"
        />
    </div>
</template>

<style>
.vue-flow__node-application {
    box-sizing: border-box;
    min-width: 110px;

    border: 1px solid #dbe3ee;
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);

    transition: box-shadow 0.15s ease, border-color 0.15s ease;
}

.vue-flow__node-application:hover {
    border-color: #c3cfde;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
}

.vue-flow__node-application.selected {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}
</style>

<style scoped>
/* Fill the whole Vue Flow node, so the border follows the node size */
.application-node {
    box-sizing: border-box;
    width: 100%;
    min-height: 100%;

    color: #1e293b;
}


/* Header */

.application-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;

    padding: 7px 10px;

    font-size: 11px;
}

.application-header.has-information {
    justify-content: flex-start;
    padding: 4px 6px;

    border-bottom: 1px solid #eef2f7;
    border-radius: 7px 7px 0 0;
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);

    font-size: 8px;
}

.application-icon {
    display: inline-flex;
    flex: 0 0 auto;
    width: 1.1em;
    height: 1.1em;
}

.application-icon svg {
    width: 100%;
    height: 100%;
    fill: none;
    stroke: #3b82f6;
    stroke-width: 1.4;
}

.application-icon circle {
    fill: #3b82f6;
}

.application-name {
    min-width: 0;
    overflow: hidden;

    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
}


/* Information table */

.information-container {
    display: flex;
    flex: 1;
    width: 100%;
    padding: 3px 0 4px;
}

.information-column {
    width: 50%;
    min-width: 0;
    padding: 0 4px;

    font-size: 6px;
    line-height: 1.2;
}

.output-column {
    border-left: 1px solid #eef2f7;
}

.information-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    margin-bottom: 3px;

    color: #64748b;
    font-size: 5px;
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

.output-column .title-dot {
    background: #f59e0b;
}


/* Information objects */

.information-object {
    min-width: 0;
    margin-bottom: 2px;

    border: 1px solid #e0e7ff;
    border-radius: 3px;
    background: #f5f7ff;
}

.information-object.drop-target {
    border-style: dashed;
    border-color: #6366f1;
    background: #eef2ff;
}

.information-object-row {
    display: flex;
    align-items: center;
    gap: 2px;
    min-width: 0;
    padding: 1.5px 2px;

    border-radius: 3px;
    cursor: pointer;
}

.information-object-row:hover {
    background: #e0e7ff;
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
    stroke: #6366f1;
    stroke-width: 1.4;
}

.information-object-name {
    flex: 1;
    min-width: 0;

    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;

    color: #3730a3;
    font-weight: 700;
}

.object-field-count {
    flex: 0 0 auto;
    padding: 0 2px;
    border-radius: 999px;

    background: #e0e7ff;
    color: #4f46e5;
    font-size: 4.5px;
    font-weight: 600;
}


/* Individual information fields */

.information-fields-list,
.object-information-fields {
    margin: 0;
    padding: 0;
    list-style: none;
}

.information-fields-list li,
.object-information-fields li {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;

    padding: 1.5px 2px;
    border-radius: 2px;
    line-height: 1.2;

    cursor: grab;
    transition: background 0.1s ease;
}

.information-fields-list li:hover,
.object-information-fields li:hover {
    background: #f1f5f9;
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


/* Outputs that are not used by any other resource */

.information-fields-list li.unused {
    background: #fef2f2;
    color: #b91c1c;
}

.information-fields-list li.unused::before {
    background: #ef4444;
}

.information-object.unused {
    border-color: #fecaca;
    background: #fef2f2;
}

.information-object.unused .information-object-name {
    color: #b91c1c;
}

.information-object.unused .object-field-count {
    background: #fee2e2;
    color: #dc2626;
}


/* Inputs that come from another application without an api url that sends them */

.information-fields-list li.not-sent {
    background: #fffbeb;
    color: #b45309;
}

.information-fields-list li.not-sent::before {
    background: #f59e0b;
}

.information-object.not-sent {
    border-color: #fcd34d;
    background: #fffbeb;
}

.information-object.not-sent .information-object-name {
    color: #b45309;
}

.information-object.not-sent .object-field-count {
    background: #fef3c7;
    color: #d97706;
}


/* Fields belonging to an InformationObject */

.object-information-fields {
    padding: 0 2px 2px 6px;
}

.object-information-fields li {
    padding-left: 3px;
    border-left: 1px solid #c7d2fe;
    border-radius: 0 2px 2px 0;
}
</style>
