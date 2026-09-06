<script setup lang="ts">
    import { Handle, Position, type NodeProps } from '@vue-flow/core';
    const props = defineProps<NodeProps>();
</script>

<template>
    <div class="vue-flow__node-default" >
        <!-- Top connection point -->
        <Handle
            type="target"
            :position="Position.Top"
        />
        <div class="application-name"
            :class="{
                'has-information-fields':
                    props.data.inputInformationFields &&
                    props.data.outputInformationFields
            }" 
        >
            {{ props.data.label }}
        </div>

        <div 
            v-if="props.data.inputInformationFields && props.data.outputInformationFields" 
            class="information-fields-container"
        >
            <div class="information-fields-column">
                <div class="information-fields-title">
                    Inputs
                </div>

                <ul class="information-fields-list">
                    <li
                        v-for="informationField in props.data.inputInformationFields"
                        :key="informationField.id"
                    >
                        {{ informationField.fieldName }}
                    </li>
                </ul>
            </div>

            <div class="information-fields-column output-column" >
                <div class="information-fields-title">
                    Outputs
                </div>

                <ul class="information-fields-list">
                    <li
                        v-for="informationField in props.data.outputInformationFields"
                        :key="informationField.id"
                    >
                        {{ informationField.fieldName }}
                    </li>
                </ul>
            </div>
        </div>

        <!-- Bottom connection point -->
        <Handle
            type="source"
            :position="Position.Bottom"
        />
    </div>
</template>

<style scoped>
.application-node {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 5px;
    box-sizing: border-box;
}

.application-name {
    text-align: center;
    font-weight: 600;
}

.application-name.has-information-fields {
    padding-bottom: 4px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.15);
}

.information-fields-container {
    display: flex;
    flex: 1;
    width: 100%;
    margin-top: 4px;
}

.information-fields-column {
    width: 50%;
    min-width: 0;
    padding: 0 4px;

    font-size: 6px;
    line-height: 1.2;
}

.output-column {
    border-left: 1px solid rgba(0, 0, 0, 0.15);
}

.information-fields-title {
    margin-bottom: 3px;

    font-size: 6px;
    font-weight: 700;
    line-height: 1.2;

    text-align: center;
}

.information-fields-list {
    margin: 0;
    padding: 0;
    list-style: none;
}

.information-fields-list li {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;

    padding: 1.5px 0;
    line-height: 1.2;
}
</style>