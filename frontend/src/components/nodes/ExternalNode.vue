<script setup lang="ts">
    import { computed } from 'vue';
    import { Handle, Position, type NodeProps } from '@vue-flow/core';
    import { getExternalKindInfo, type ExternalKind } from '../../types/external.types';
    import type { ResolvedInformationFieldReference } from '../../types/informationField.type';
    import type { ResolvedInformationObjectReference } from '../../types/informationObject.type';

    interface ExternalNodeData {
        label: string;
        resourceId: string;
        kind: ExternalKind;
        externalOrganisation: string;
        expanded: boolean;
        providedInformationFields: ResolvedInformationFieldReference[];
        providedInformationObjects: ResolvedInformationObjectReference[];
        receivedInformationFields: ResolvedInformationFieldReference[];
        receivedInformationObjects: ResolvedInformationObjectReference[];
    }

    const props = defineProps<NodeProps<ExternalNodeData>>();

    const kindInfo = computed(() => getExternalKindInfo(props.data.kind));

    // A black box: only the information going in and out is known.
    // Like the inputs and outputs of an application: what goes in on the left, what comes out on the right
    const columns = computed(() => [
        {
            title: 'Receives',
            objects: props.data.receivedInformationObjects,
            fields: props.data.receivedInformationFields
        },
        {
            title: 'Provides',
            objects: props.data.providedInformationObjects,
            fields: props.data.providedInformationFields
        }
    ]);
</script>

<template>
    <div class="external-node" :class="{ expanded: props.data.expanded }">
        <Handle
            type="target"
            :position="Position.Top"
        />

        <header class="external-header">
            <span class="external-icon">
                <i :class="kindInfo.icon" />
            </span>

            <span class="external-title">
                <span v-if="!props.data.expanded" class="external-badge">External</span>
                <span class="external-name">{{ props.data.label }}</span>
                <span
                    v-if="!props.data.expanded && props.data.externalOrganisation"
                    class="external-organisation"
                >
                    {{ props.data.externalOrganisation }}
                </span>
            </span>

            <!-- At the database level the kind of resource is shown on the right of the banner -->
            <span v-if="props.data.expanded" class="banner-badge">External</span>
        </header>

        <div
            v-if="props.data.expanded && props.data.externalOrganisation"
            class="external-organisation-line"
        >
            {{ props.data.externalOrganisation }}
        </div>

        <div
            v-if="props.data.expanded"
            class="external-information"
        >
            <div
                v-for="column in columns"
                :key="column.title"
                class="external-column"
            >
                <div class="external-column-title">{{ column.title }}</div>

                <div
                    v-for="informationObject in column.objects"
                    :key="informationObject.informationObject.id"
                    class="external-object"
                >
                    ▱ {{ informationObject.informationObject.objectName }}
                </div>

                <div
                    v-for="informationField in column.fields"
                    :key="informationField.informationField.id"
                    class="external-field"
                >
                    {{ informationField.informationField.fieldName }}
                </div>

                <div
                    v-if="!column.objects.length && !column.fields.length"
                    class="external-empty"
                >
                    —
                </div>
            </div>
        </div>

        <Handle
            type="source"
            :position="Position.Bottom"
        />
    </div>
</template>

<!-- Not scoped: styles the Vue Flow node wrapper -->
<style>
.vue-flow__node-external {
    box-sizing: border-box;

    border: 1.5px dashed #94a3b8;
    border-radius: 10px;
    background:
        repeating-linear-gradient(
            -45deg,
            rgba(148, 163, 184, 0.07),
            rgba(148, 163, 184, 0.07) 6px,
            transparent 6px,
            transparent 12px
        ),
        #f8fafc;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);

    transition: box-shadow 0.15s ease, border-color 0.15s ease;
}

.vue-flow__node-external:hover {
    border-color: #64748b;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
}

.vue-flow__node-external.selected {
    border-color: #475569;
    box-shadow: 0 0 0 2px rgba(71, 85, 105, 0.2);
}
</style>

<style scoped>
.external-node {
    color: #334155;
}

.external-header {
    display: flex;
    align-items: center;
    gap: 7px;

    padding: 7px 9px;
}

/* The same banner as the application node at the database level */
.external-node.expanded .external-header {
    gap: 5px;
    padding: 4px 6px;

    border-bottom: 1px dashed #cbd5e1;
    border-radius: 9px 9px 0 0;
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
}

.external-node.expanded .external-title {
    flex: 1;
}

.banner-badge {
    flex: 0 0 auto;
    margin-left: auto;
    padding: 0 4px;
    border-radius: 999px;

    background: #e2e8f0;
    color: #475569;
    font-size: 5px;
    font-weight: 700;
    letter-spacing: 0.1em;
    line-height: 9px;
    text-transform: uppercase;
}

.external-organisation-line {
    padding: 3px 7px 0;

    overflow: hidden;
    color: #64748b;
    font-size: 6px;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.external-icon {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;

    width: 22px;
    height: 22px;
    border-radius: 6px;

    background: #e2e8f0;
    color: #475569;
    font-size: 11px;
}

.external-node.expanded .external-icon {
    width: 1.1em;
    height: 1.1em;
    border-radius: 3px;

    background: transparent;
    font-size: 8px;
}

.external-title {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.external-badge {
    color: #94a3b8;
    font-size: 7px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
}

.external-name {
    overflow: hidden;

    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.external-organisation {
    overflow: hidden;

    color: #64748b;
    font-size: 8px;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.external-node.expanded .external-name {
    font-size: 8px;
}

.external-node.expanded .external-organisation {
    font-size: 6px;
}

.external-node.expanded .external-badge {
    font-size: 5px;
}

/* Information going in and out of the black box */

.external-information {
    display: flex;
    padding: 3px 0 4px;
}

.external-column {
    width: 50%;
    min-width: 0;
    padding: 0 4px;

    font-size: 6px;
    line-height: 1.2;
}

.external-column + .external-column {
    border-left: 1px dashed #cbd5e1;
}

.external-column-title {
    margin-bottom: 3px;

    color: #64748b;
    font-size: 5px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-align: center;
    text-transform: uppercase;
}

.external-object,
.external-field {
    overflow: hidden;
    padding: 1.5px 2px;

    white-space: nowrap;
    text-overflow: ellipsis;
}

.external-object {
    color: #475569;
    font-weight: 700;
}

.external-empty {
    color: #cbd5e1;
    text-align: center;
}
</style>
