<script setup lang="ts">
    import { computed } from 'vue';
    import { BaseEdge, getBezierPath, type EdgeProps } from '@vue-flow/core';
    import type { CanvasEdge } from '../../projections/types/canvasEdge';

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

    // An edge without any connection only exists to show that information is sent without a connection
    const hasConnections = computed(() =>
        (props.data?.apiIds.length ?? 0) +
        (props.data?.databaseConnectionIds.length ?? 0) +
        (props.data?.scriptIds.length ?? 0) > 0
    );

    function plural(count: number, single: string, multiple: string) {
        return `${count} ${count === 1 ? single : multiple}`;
    }

    const label = computed(() => {
        const parts: string[] = [];

        const apiCount = props.data?.apiIds.length ?? 0;
        const databaseCount = props.data?.databaseConnectionIds.length ?? 0;
        const scriptCount = props.data?.scriptIds.length ?? 0;

        if (apiCount) parts.push(plural(apiCount, 'API', "API's"));
        if (databaseCount) parts.push(plural(databaseCount, 'DB', "DB's"));
        if (scriptCount) parts.push(plural(scriptCount, 'script', 'scripts'));
        if (!hasConnections.value) parts.push('No connection');

        const text = parts.join(' · ');
        return warningCount.value ? `⚠ ${text} · ${plural(warningCount.value, 'warning', 'warnings')}` : text;
    });

    const edgeStyle = computed(() => ({
        stroke: warningCount.value ? '#f59e0b' : props.selected ? '#6366f1' : '#94a3b8',
        strokeWidth: props.selected ? 2 : 1.5,
        strokeDasharray: hasConnections.value ? undefined : '5 4'
    }));

    const labelStyle = computed(() => ({
        fill: warningCount.value ? '#92400e' : props.selected ? '#4338ca' : '#475569',
        fontSize: '9px',
        fontWeight: 600
    }));

    const labelBgStyle = computed(() => ({
        fill: warningCount.value ? '#fffbeb' : '#ffffff',
        stroke: warningCount.value ? '#fcd34d' : props.selected ? '#a5b4fc' : '#e2e8f0',
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
        :label="label"
        :label-x="path[1]"
        :label-y="path[2]"
        :label-style="labelStyle"
        :label-show-bg="true"
        :label-bg-style="labelBgStyle"
        :label-bg-padding="[7, 3]"
        :label-bg-border-radius="8"
    />
</template>
