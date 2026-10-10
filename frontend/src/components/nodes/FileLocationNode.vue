<script setup lang="ts">
    import { computed } from 'vue';
    import { Handle, Position, type NodeProps } from '@vue-flow/core';
    import { useInformationRelationStore } from '../../stores/information/informationRelation.store';

    interface FileLocationNodeData {
        label: string;
        resourceId: string;
        expanded: boolean;
    }

    const props = defineProps<NodeProps<FileLocationNodeData>>();

    const informationRelationStore = useInformationRelationStore();

    // How much information is stored in the file location, as recorded by the relations to it
    const storedInformationCount = computed(() => {
        const fieldIds = new Set(informationRelationStore.fieldRelations
            .filter(relation => relation.targetResourceId === props.data.resourceId)
            .map(relation => relation.informationFieldId));
        const objectIds = new Set(informationRelationStore.objectRelations
            .filter(relation => relation.targetResourceId === props.data.resourceId)
            .map(relation => relation.informationObjectId));
        return fieldIds.size + objectIds.size;
    });
</script>

<template>
    <!-- Database level: a banner like the application node, with what is stored below it -->
    <div v-if="props.data.expanded" class="file-location-card">
        <Handle
            type="target"
            :position="Position.Top"
        />

        <header class="file-location-banner">
            <svg class="banner-icon" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M1.75 4.25c0-.83.67-1.5 1.5-1.5h3l1.5 1.75h5c.83 0 1.5.67 1.5 1.5v6.25c0 .83-.67 1.5-1.5 1.5h-9.5c-.83 0-1.5-.67-1.5-1.5z" />
            </svg>
            <span class="banner-name">{{ props.data.label }}</span>
            <span class="banner-badge">File location</span>
        </header>

        <div class="file-location-body">
            {{ storedInformationCount
                ? `${storedInformationCount} information ${storedInformationCount === 1 ? 'field or object' : 'fields and objects'} stored`
                : 'Nothing stored yet' }}
        </div>

        <Handle
            type="source"
            :position="Position.Bottom"
        />
    </div>

    <!-- Application level: a card with only the name -->
    <div v-else class="file-location-node">
        <Handle
            type="target"
            :position="Position.Top"
        />

        <span class="file-location-icon">
            <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M1.75 4.25c0-.83.67-1.5 1.5-1.5h3l1.5 1.75h5c.83 0 1.5.67 1.5 1.5v6.25c0 .83-.67 1.5-1.5 1.5h-9.5c-.83 0-1.5-.67-1.5-1.5z" />
            </svg>
        </span>

        <span class="file-location-text">
            <span class="file-location-badge">File location</span>
            <span class="file-location-name">{{ props.data.label }}</span>
        </span>

        <span
            v-if="storedInformationCount"
            class="file-location-count"
            :title="`${storedInformationCount} information fields and objects are stored here`"
        >
            {{ storedInformationCount }}
        </span>

        <Handle
            type="source"
            :position="Position.Bottom"
        />
    </div>
</template>

<!-- Not scoped: styles the Vue Flow node wrapper -->
<style>
.vue-flow__node-fileLocation {
    box-sizing: border-box;

    border: 1px solid #fed7aa;
    border-radius: 10px;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);

    transition: box-shadow 0.15s ease, border-color 0.15s ease;
}

.vue-flow__node-fileLocation:hover {
    border-color: #fdba74;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
}

.vue-flow__node-fileLocation.selected {
    border-color: #ea580c;
    box-shadow: 0 0 0 2px rgba(234, 88, 12, 0.18);
}
</style>

<style scoped>
/* Database level: the same banner as the application node */
.file-location-card {
    color: #1e293b;
}

.file-location-banner {
    display: flex;
    align-items: center;
    gap: 5px;

    padding: 4px 6px;

    border-bottom: 1px solid #ffedd5;
    border-radius: 9px 9px 0 0;
    background: linear-gradient(180deg, #fffaf5 0%, #fff7ed 100%);

    font-size: 8px;
}

.banner-icon {
    flex: 0 0 auto;
    width: 1.1em;
    height: 1.1em;

    fill: #ffedd5;
    stroke: #ea580c;
    stroke-width: 1.3;
    stroke-linejoin: round;
}

.banner-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;

    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.banner-badge {
    flex: 0 0 auto;
    padding: 0 4px;
    border-radius: 999px;

    background: #ffedd5;
    color: #c2410c;
    font-size: 5px;
    font-weight: 700;
    letter-spacing: 0.1em;
    line-height: 9px;
    text-transform: uppercase;
}

.file-location-body {
    padding: 4px 7px 5px;

    color: #64748b;
    font-size: 6px;
}

.file-location-node {
    display: flex;
    align-items: center;
    gap: 8px;

    padding: 7px 10px;
    color: #1e293b;
}

.file-location-icon {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;

    width: 24px;
    height: 24px;
    border-radius: 6px;

    background: #fff7ed;
}

.file-location-icon svg {
    width: 14px;
    height: 14px;
    fill: #ffedd5;
    stroke: #ea580c;
    stroke-width: 1.3;
    stroke-linejoin: round;
}

.file-location-text {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
}

.file-location-badge {
    color: #c2410c;
    font-size: 7px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
}

.file-location-name {
    overflow: hidden;

    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.file-location-count {
    flex: 0 0 auto;
    padding: 0 6px;
    border-radius: 999px;

    background: #ffedd5;
    color: #c2410c;
    font-size: 9px;
    font-weight: 600;
    line-height: 15px;
}
</style>
