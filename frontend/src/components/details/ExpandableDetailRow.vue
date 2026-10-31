<script setup lang="ts">
    import { ref } from 'vue';

    // A row in a detail section that opens to show what is in the slot
    defineProps<{
        icon: string;
        label: string;
        count: number;
        removeTitle: string;
    }>();

    const emit = defineEmits<{
        remove: [];
    }>();

    const expanded = ref(false);
</script>

<template>
    <div>
        <div class="detail-row expandable-row" @click="expanded = !expanded">
            <i class="pi pi-chevron-right expand-chevron" :class="{ expanded }" />
            <i :class="icon" class="detail-row-icon" />
            <span class="detail-row-name">{{ label }}</span>
            <span class="detail-count">{{ count }}</span>
            <button
                type="button"
                class="detail-delete-button"
                :title="removeTitle"
                @click.stop="emit('remove')"
            >
                ×
            </button>
        </div>

        <div v-if="expanded" class="expandable-content">
            <slot />
        </div>
    </div>
</template>

<style scoped>
.expandable-row {
    cursor: pointer;
}

.expand-chevron {
    color: #94a3b8;
    font-size: 8px;
    transition: transform 0.15s ease;
}

.expand-chevron.expanded {
    transform: rotate(90deg);
}

.expandable-content {
    margin: 2px 0 6px 14px;
    padding: 4px 0 2px 8px;
    border-left: 2px solid #e0e7ff;
}
</style>
