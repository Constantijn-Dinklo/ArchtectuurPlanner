<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { useInformationChainService, type InformationKind } from '../../services/informationChain.service';
    import { useInformationFieldStore } from '../../stores/information/informationField.store';
    import { useInformationObjectStore } from '../../stores/information/informationObject.store';
    import InformationChainView from '../InformationChainView.vue';

    // One piece of information. Its chains and what uses it are only worked out when the card is opened
    const props = defineProps<{
        kind: InformationKind;
        informationId: string;
        name: string;
    }>();

    const informationChainService = useInformationChainService();
    const informationFieldStore = useInformationFieldStore();
    const informationObjectStore = useInformationObjectStore();

    const expanded = ref(false);
    const chain = computed(() => informationChainService.getChain(props.kind, props.informationId));

    // What still uses the information; undefined until it is known. It can only be deleted when nothing does
    const usage = ref<string[]>();
    const deleteError = ref('');

    async function toggle() {
        expanded.value = !expanded.value;
        if (!expanded.value) return;

        usage.value = undefined;
        deleteError.value = '';
        try {
            usage.value = props.kind === 'field'
                ? await informationFieldStore.fetchUsage(props.informationId)
                : await informationObjectStore.fetchUsage(props.informationId);
        }
        catch (error: any) {
            deleteError.value = error.response?.data?.error ?? `Could not check what uses this (${error.message})`;
        }
    }

    // Deleting asks for a second click, so information is not removed by accident
    const isConfirmingDelete = ref(false);
    let confirmTimeout: ReturnType<typeof setTimeout> | undefined;

    async function onDeleteClick() {
        if (!isConfirmingDelete.value) {
            isConfirmingDelete.value = true;
            confirmTimeout = setTimeout(() => { isConfirmingDelete.value = false; }, 3000);
            return;
        }
        clearTimeout(confirmTimeout);
        isConfirmingDelete.value = false;

        try {
            if (props.kind === 'field') await informationFieldStore.deleteInformationField(props.informationId);
            else await informationObjectStore.deleteInformationObject(props.informationId);
        }
        catch (error: any) {
            deleteError.value = error.response?.data?.error ?? `Could not delete this (${error.message})`;
        }
    }
</script>

<template>
    <article class="data-catalogue-card" :class="{ expanded }">
        <button type="button" class="card-header" :aria-expanded="expanded" @click="toggle">
            <i class="pi pi-chevron-right card-chevron" />
            <span class="card-icon" :class="kind" aria-hidden="true">{{ kind === 'object' ? '▱' : '' }}</span>
            <span class="card-name">{{ name }}</span>
        </button>

        <div v-if="expanded && chain" class="card-content">
            <InformationChainView :chain="chain" />

            <!-- Only offered when nothing uses the information -->
            <button
                v-if="usage && !usage.length"
                type="button"
                class="delete-button"
                :class="{ confirming: isConfirmingDelete }"
                @click="onDeleteClick"
            >
                <i class="pi pi-trash" />
                {{ isConfirmingDelete ? 'Click again to delete' : 'Delete' }}
            </button>

            <div v-if="deleteError" class="card-error">{{ deleteError }}</div>
        </div>
    </article>
</template>

<style scoped>
.data-catalogue-card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #ffffff;
}

.card-header {
    display: flex;
    align-items: center;
    gap: 8px;

    width: 100%;
    min-height: 36px;
    padding: 0 12px;

    border: 0;
    border-radius: 8px;
    background: transparent;

    color: #1e293b;
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.card-header:hover {
    background: #f8fafc;
}

.card-chevron {
    color: #94a3b8;
    font-size: 9px;
    transition: transform 0.15s ease;
}

.expanded .card-chevron {
    transform: rotate(90deg);
}

.card-icon {
    display: inline-flex;
    flex: 0 0 12px;
    align-items: center;
    justify-content: center;
    color: #4f46e5;
}

/* The same dot as the fields in the inputs and outputs of a node */
.card-icon.field::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #94a3b8;
}

.card-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;

    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.card-content {
    padding: 4px 12px 10px 22px;
    border-top: 1px solid #f1f5f9;
    color: var(--p-text-color);
}

.delete-button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 26px;
    margin-top: 8px;
    padding: 0 9px;

    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #ffffff;

    color: #64748b;
    font: inherit;
    font-size: 11px;
    cursor: pointer;
}

.delete-button:hover {
    border-color: #fecaca;
    background: #fef2f2;
    color: #dc2626;
}

.delete-button.confirming {
    border-color: #dc2626;
    background: #dc2626;
    color: #ffffff;
}

.card-error {
    margin-top: 6px;
    color: #b91c1c;
    font-size: 11px;
}
</style>
