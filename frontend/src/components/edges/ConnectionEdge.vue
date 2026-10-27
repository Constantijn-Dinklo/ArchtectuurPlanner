<script setup lang="ts">
    import { computed } from 'vue';
    import { BaseEdge, getBezierPath, type EdgeProps } from '@vue-flow/core';
    import type { CanvasEdge } from '../../projections/types/canvasEdge';
    import { getOtherConnectionMethodInfo } from '../../stores/otherConnection.store';

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
    // Information is moved without any connection: an error instead of a warning
    const hasError = computed(() => props.data?.hasError ?? false);

    const otherCount = computed(() => props.data?.otherConnectionIds.length ?? 0);

    // Scripts of the Scripts tab and script components inside an application or file location
    const scriptCount = computed(() => (props.data?.scriptIds.length ?? 0) + (props.data?.componentScriptIds.length ?? 0));

    const systemConnectionCount = computed(() =>
        (props.data?.apiIds.length ?? 0) +
        (props.data?.databaseConnectionIds.length ?? 0) +
        scriptCount.value
    );

    // Not a connection: the component at the end is part of the resource at the start
    const isPartOf = computed(() => props.data?.partOf ?? false);

    // An edge without any connection only exists to show that information is sent without a connection
    const hasConnections = computed(() => systemConnectionCount.value + otherCount.value > 0);

    // Only other connections (by hand, a send button, a file, ...): shown with a dashed line
    const isOtherOnly = computed(() => otherCount.value > 0 && systemConnectionCount.value === 0);

    function plural(count: number, single: string, multiple: string) {
        return `${count} ${count === 1 ? single : multiple}`;
    }

    const label = computed(() => {
        if (isPartOf.value) return '';
        const parts: string[] = [];

        const apiCount = props.data?.apiIds.length ?? 0;
        const databaseCount = props.data?.databaseConnectionIds.length ?? 0;

        if (apiCount) parts.push(plural(apiCount, 'API', "API's"));
        if (databaseCount) parts.push(plural(databaseCount, 'DB', "DB's"));
        if (scriptCount.value) parts.push(plural(scriptCount.value, 'script', 'scripts'));
        // Other connections are counted per method, e.g. "1 by hand · 2 send function"
        const methodCounts = new Map<string, number>();
        for (const method of props.data?.otherConnectionMethods ?? []) {
            const methodLabel = getOtherConnectionMethodInfo(method).label.toLowerCase();
            methodCounts.set(methodLabel, (methodCounts.get(methodLabel) ?? 0) + 1);
        }
        for (const [methodLabel, count] of methodCounts) {
            parts.push(`${count} ${methodLabel}`);
        }
        if (!hasConnections.value) parts.push('No connection');

        const text = parts.join(' · ');
        if (hasError.value) return `✕ ${text} · error`;
        return warningCount.value ? `⚠ ${text} · ${plural(warningCount.value, 'warning', 'warnings')}` : text;
    });

    const edgeStyle = computed(() => isPartOf.value ? {
        // A thin dotted line, like a tether: it shows where the component belongs, no information flows over it
        stroke: '#cbd5e1',
        strokeWidth: 1,
        strokeDasharray: '2 3',
        strokeLinecap: 'round' as const
    } : ({
        stroke: hasError.value ? '#ef4444' : warningCount.value ? '#f59e0b' : props.selected ? '#6366f1' : '#94a3b8',
        strokeWidth: props.selected ? 2 : 1.5,
        // Dashed: other connections (by hand, a send button, ...). Dotted: information flows without any connection
        strokeDasharray: isOtherOnly.value ? '6 4' : hasConnections.value ? undefined : '1.5 4',
        strokeLinecap: hasConnections.value ? undefined : 'round' as const
    }));

    const labelStyle = computed(() => ({
        fill: hasError.value ? '#b91c1c' : warningCount.value ? '#92400e' : props.selected ? '#4338ca' : '#475569',
        fontSize: '9px',
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
