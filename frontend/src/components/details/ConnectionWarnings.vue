<script setup lang="ts">
    import { vCollapsible } from '../../directives/collapsible';
    import type { ConnectionWarning } from '../../services/informationTransfer.service';

    import { computed } from 'vue';

    const props = defineProps<{
        warnings: ConnectionWarning[]
    }>();

    // An error (information moved without any connection) makes the whole card red
    const hasError = computed(() => props.warnings.some(warning => warning.severity === 'error'));
</script>

<!-- The problems with a connection, each with what is affected and how to fix it -->
<template>
    <section v-collapsible
        v-if="warnings.length"
        class="detail-section connection-warnings"
        :class="{ error: hasError }"
    >
        <div class="detail-section-title warnings-title">
            <i :class="hasError ? 'pi pi-times-circle' : 'pi pi-exclamation-triangle'" />
            <span>{{ hasError ? 'Errors' : 'Warnings' }}</span>
            <span class="detail-count warnings-count">{{ warnings.length }}</span>
        </div>

        <div
            v-for="warning in warnings"
            :key="warning.title"
            class="connection-warning"
            :class="{ error: warning.severity === 'error' }"
        >
            <div class="warning-title">{{ warning.title }}</div>

            <div class="warning-items">
                <span
                    v-for="item in warning.items"
                    :key="item"
                    class="warning-item"
                >
                    {{ item }}
                </span>
            </div>

            <div class="warning-hint">
                <i class="pi pi-wrench" />
                <span>{{ warning.hint }}</span>
            </div>
        </div>
    </section>
</template>

<style scoped>
/* Errors: information is moved without any connection */
.connection-warnings.error {
    border-color: #fca5a5;
    background: #fef2f2;
}

.connection-warnings.error .warnings-title {
    color: #b91c1c;
}

.connection-warnings.error .warnings-count {
    background: #fee2e2;
    color: #b91c1c;
}

.connection-warning.error .warning-title {
    color: #991b1b;
}

.connection-warning.error .warning-item {
    border-color: #fca5a5;
    color: #991b1b;
}

.connection-warning.error .warning-hint {
    color: #7f1d1d;
}

.connection-warning.error .warning-hint .pi {
    color: #dc2626;
}

.connection-warnings {
    border-color: #fcd34d;
    background: #fffbeb;
}

.warnings-title {
    color: #b45309;
}

.warnings-title .pi {
    font-size: 11px;
}

.warnings-count {
    background: #fef3c7;
    color: #b45309;
}

.connection-warning {
    padding: 8px 0;
}

.connection-warning + .connection-warning {
    border-top: 1px dashed #fde68a;
}

.warning-title {
    margin-bottom: 5px;

    color: #92400e;
    font-size: 12px;
    font-weight: 600;
}

.warning-items {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 6px;
}

.warning-item {
    padding: 1px 8px;
    border: 1px solid #fcd34d;
    border-radius: 999px;

    background: #ffffff;
    color: #92400e;
    font-size: 11px;
}

.warning-hint {
    display: flex;
    align-items: flex-start;
    gap: 6px;

    color: #78350f;
    font-size: 11px;
    line-height: 1.4;
}

.warning-hint .pi {
    margin-top: 2px;
    color: #d97706;
    font-size: 10px;
}
</style>
