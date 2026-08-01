
<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core';
import { computed } from 'vue';
import { useResourceService } from '../../services/resources/resource.service';
import type { Table } from '../../stores/resources/table.store';

const props = defineProps<NodeProps>();
const resourceService = useResourceService();


const table = computed(() =>
    resourceService.getResource(props.data.resourceId) as Table | undefined
);
</script>

<template>
    <div v-if="table">
        <div>
            {{  props.data.label }}
        </div>
        <div>
            <ul v-for="column in table.columns" class="column-list">
                <li>
                    {{ column }}
                </li>
            </ul>
        </div>
    </div>
    <div v-else>
        No Table
    </div>
</template>

<style lang="css">
.vue-flow__node-table {
    background: #9CA8B3;
    color: #fff;
    padding: 10px;

    box-shadow: 0 1px 4px 1px rgba(0, 0, 0, 0.08);

    border-width: 1px;
    border-style: solid;
    border-radius: 3px;
}

.column-list {
    padding: 1px;
}
</style>