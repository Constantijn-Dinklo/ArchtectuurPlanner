<script setup lang="ts">
    import { computed } from 'vue';
    import { BaseEdge, getBezierPath, type EdgeProps } from '@vue-flow/core';
    import type { CanvasEdge } from '../../projections/types/canvasEdge';
    import { getConnectionKindInfo } from '../../types/connection.types';

    const props = defineProps<EdgeProps<CanvasEdge['data']>>();

    // [path, labelX, labelY]: the label coordinates are the middle of the curve
    const path = computed(() => getBezierPath({
        sourceX: props.sourceX,
        sourceY: props.sourceY,
        sourcePosition: props.sourcePosition,
        targetX: props.targetX,
        targetY: props.targetY,
        targetPosition: props.targetPosition
    }));

    const warningCount = computed(() => props.data?.warnings.length ?? 0);
    // Something is wrong over this edge: an error instead of a warning
    const hasError = computed(() => props.data?.hasError ?? false);

    const kinds = computed(() => props.data?.connectionKinds ?? []);

    // Only connections that are not a system link (an API or a database connection), such as by hand, a file or
    // unknown: shown with a dashed line
    const isLooseOnly = computed(() =>
        kinds.value.length > 0 && kinds.value.every(kind => kind !== 'api' && kind !== 'database')
    );

    function plural(count: number, single: string, multiple: string) {
        return `${count} ${count === 1 ? single : multiple}`;
    }

    // Counted per kind, e.g. "1 API · 1 DB · 2 by hand". A connection of which it is not chosen yet how it goes only
    // shows as the dashed line
    const label = computed(() => {
        const counts = new Map<string, number>();
        for (const kind of kinds.value.filter(kind => kind !== 'undecided')) {
            const kindLabel = kind === 'api' ? 'API' : kind === 'database' ? 'DB' : getConnectionKindInfo(kind).label.toLowerCase();
            counts.set(kindLabel, (counts.get(kindLabel) ?? 0) + 1);
        }
        const parts = [...counts].map(([kindLabel, count]) => `${count} ${kindLabel}`);

        const text = parts.join(' · ');
        if (hasError.value) return `✕ ${text} · error`;
        return warningCount.value ? `⚠ ${text} · ${plural(warningCount.value, 'warning', 'warnings')}` : text;
    });

    const edgeStyle = computed(() => ({
        stroke: hasError.value ? '#ef4444' : warningCount.value ? '#f59e0b' : props.selected ? '#6366f1' : '#94a3b8',
        strokeWidth: props.selected ? 2 : 1.5,
        // Dashed: only connections that are not a system link (by hand, a file, unknown, ...)
        strokeDasharray: isLooseOnly.value ? '6 4' : undefined
    }));

    const labelStyle = computed(() => ({
        fill: hasError.value ? '#b91c1c' : warningCount.value ? '#92400e' : props.selected ? '#4338ca' : '#475569',
        fontSize: 'var(--canvas-type-edge-label)',
        fontWeight: 600
    }));

    const labelBgStyle = computed(() => ({
        fill: hasError.value ? '#fef2f2' : warningCount.value ? '#fffbeb' : '#ffffff',
        stroke: hasError.value ? '#fca5a5' : warningCount.value ? '#fcd34d' : props.selected ? '#a5b4fc' : '#e2e8f0',
        strokeWidth: 1
    }));
</script>

<!-- The label is rendered by BaseEdge inside the svg, so it is always placed on the middle of the curve -->
<template>
    <BaseEdge
        :id="id"
        :path="path[0]"
        :marker-end="markerEnd"
        :style="edgeStyle"
        :interaction-width="20"
        :label="label || undefined"
        :label-x="path[1]"
        :label-y="path[2]"
        :label-style="labelStyle"
        :label-show-bg="true"
        :label-bg-style="labelBgStyle"
        :label-bg-padding="[7, 3]"
        :label-bg-border-radius="8"
    />
</template>
