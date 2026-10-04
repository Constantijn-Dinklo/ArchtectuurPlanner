<script setup lang="ts">
    import type { ConnectionWarning } from '../../services/informationTransfer.service';

    defineProps<{
        warnings: ConnectionWarning[]
    }>();
</script>

<!-- The problems with a connection, each with what is affected and how to fix it -->
<template>
    <section
        v-if="warnings.length"
        class="detail-section connection-warnings"
    >
        <div class="detail-section-title warnings-title">
            <i class="pi pi-exclamation-triangle" />
            <span>Warnings</span>
            <span class="detail-count warnings-count">{{ warnings.length }}</span>
        </div>

        <div
            v-for="warning in warnings"
            :key="warning.title"
            class="connection-warning"
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
