<script setup lang="ts">
    import { computed } from 'vue';
    import { Handle, Position, type NodeProps } from '@vue-flow/core';
    import type { ComponentKind } from '../../types/component.types';

    interface ComponentNodeData {
        label: string;
        resourceId: string;
        kind: ComponentKind;
        icon: string;
        // The resource the component is part of
        hostName: string;
        readsCount: number;
        writesCount: number;
        informationCount: number;
    }

    const props = defineProps<NodeProps<ComponentNodeData>>();

    // A short summary under the name: what a script reads and writes, or what a file contains
    const summary = computed(() => {
        if (props.data.kind === 'script') {
            return `reads ${props.data.readsCount} · writes ${props.data.writesCount}`;
        }
        return props.data.informationCount
            ? `${props.data.informationCount} information ${props.data.informationCount === 1 ? 'item' : 'items'}`
            : 'No information yet';
    });
</script>

<!-- A component is a part of a resource (a script, a file), shown as a small card next to that resource -->
<template>
    <div class="component-node" :class="props.data.kind">
        <Handle
            type="target"
            :position="Position.Top"
        />

        <header class="component-banner">
            <i :class="props.data.icon" class="component-icon" />
            <span class="component-name">{{ props.data.label }}</span>
            <span class="component-badge">{{ props.data.kind === 'script' ? 'Script' : 'File' }}</span>
        </header>

        <div class="component-body">
            <span class="component-host" :title="`Part of ${props.data.hostName}`">
                <i class="pi pi-link" />
                {{ props.data.hostName }}
            </span>
            <span class="component-summary">{{ summary }}</span>
        </div>

        <Handle
            type="source"
            :position="Position.Bottom"
        />
    </div>
</template>

<!-- Not scoped: styles the Vue Flow node wrapper -->
<style>
.vue-flow__node-component {
    box-sizing: border-box;

    border: 1px solid #c7d2fe;
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);

    transition: box-shadow 0.15s ease, border-color 0.15s ease;
}

.vue-flow__node-component:hover {
    border-color: #a5b4fc;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
}

.vue-flow__node-component.selected {
    border-color: #4f46e5;
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.18);
}
</style>

<style scoped>
.component-node {
    color: #1e293b;
}

/* The same banner as the other nodes at this level of detail */
.component-banner {
    display: flex;
    align-items: center;
    gap: 5px;

    padding: 4px 6px;

    border-bottom: 1px solid #eef2ff;
    border-radius: 7px 7px 0 0;
    background: linear-gradient(180deg, #f8faff 0%, #eef2ff 100%);

    font-size: var(--canvas-type-node-title);
}

.component-node.file .component-banner {
    border-bottom-color: #ffedd5;
    background: linear-gradient(180deg, #fffaf5 0%, #fff7ed 100%);
}

.component-icon {
    flex: 0 0 auto;
    color: #4f46e5;
    font-size: 1.1em;
}

.component-node.file .component-icon {
    color: #ea580c;
}

.component-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;

    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.component-badge {
    flex: 0 0 auto;
    padding: 0 4px;
    border-radius: 999px;

    background: #e0e7ff;
    color: #4338ca;
    font-size: var(--canvas-type-detail-meta);
    font-weight: 700;
    letter-spacing: 0.1em;
    line-height: 9px;
    text-transform: uppercase;
}

.component-node.file .component-badge {
    background: #ffedd5;
    color: #c2410c;
}

.component-body {
    display: flex;
    flex-direction: column;
    gap: 1px;

    padding: 3px 7px 5px;

    color: #64748b;
    font-size: var(--canvas-type-detail-text);
}

.component-host {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.component-host .pi {
    font-size: var(--canvas-type-detail-meta);
}
</style>
