<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { useSelectedNodeProjection } from '../../projections/selectedNode.projection';
    import ConnectionsDetail from '../ConnectionsDetail.vue';
    import { useApplicationStore, type Application } from '../../stores/resources/application.store.ts';
    import { useResourceService } from '../../services/resources/resource.service.ts';
    import type { AccessibleInformationField, InformationField } from '../../types/informationField.type.ts';

    const resourceService = useResourceService();

    const selectedNodeProjection = useSelectedNodeProjection();
    const applicationStore = useApplicationStore();

    const inputInformationField = ref<AccessibleInformationField | undefined>();
    const forwardedInformationField = ref<InformationField | undefined>();

    const newInputInformationFieldName = ref('');
    const newOutputInformationFieldName = ref('');

    const application = computed(
        () => selectedNodeProjection.nodeInfo.value?.node as Application | undefined
    );

    function onVersionChange() {
        if(!application.value) { return }
        applicationStore.updateApplication(application.value.id, application.value);
    }

    function addInputInformationField(applicationId: string) {
        if(!inputInformationField.value){ return }
        
        applicationStore.addApplicationInformationField(applicationId, {
            informationFieldId: inputInformationField.value.id,
            sourceResourceId: inputInformationField.value.accessibleFromId,
            sourceResourceType: inputInformationField.value.accessibleFromType
        });
        inputInformationField.value = undefined;
    }
    
    function addForwardedInformationField(applicationId: string) {
         if(forwardedInformationField.value){
            applicationStore.addApplicationInformationField(applicationId, {
                informationFieldId: forwardedInformationField.value.id,
                sourceResourceId: applicationId,
                sourceResourceType: 'application'
            }, 'output');
        }
    }

    function newInformationField(applicationId: string, direction: 'input' | 'output' = 'input') {
        applicationStore.addApplicationInformationField(applicationId, {
            fieldName: direction === 'input' ? newInputInformationFieldName.value : newOutputInformationFieldName.value
        }, direction);
    }

    function deleteInformationField(applicationId: string, informationFieldId: string, direction: 'input' | 'output' = 'input') {
        applicationStore.deleteApplicationInformationField(applicationId, informationFieldId, direction);
    }
</script>

<template>
    <div v-if="application">
        <div>
            {{ application.name }}
        </div>
        <div>
            Version: <input v-model="application.version" type="text" @change="onVersionChange"/>
        </div>
         <div v-if="selectedNodeProjection.nodeInfo.value">
            <ConnectionsDetail :connections-info="selectedNodeProjection.nodeInfo.value.connections"/>
        </div>
        <div>
            Input Information Fields
            <div>
                Connected Data
                <div v-for="informationField in application.inputInformationFields.filter((informationField) => informationField.position > 0)">
                    {{ informationField.fieldName }}
                    <button @click="deleteInformationField(application.id, informationField.id)">X</button>
                </div>
                <select v-model="inputInformationField" @change="addInputInformationField(application.id)">
                    <option value="">-- Select Information Field --</option>
                    <option
                        v-for="accessibleInformationField in resourceService.getAccessibleInformationFields(application.id)"
                        :key="accessibleInformationField.id"
                        :value="accessibleInformationField"
                        :disabled="application.inputInformationFields.some((informationField) => informationField.id === accessibleInformationField.id)"
                    >
                        {{ accessibleInformationField.fieldName }}
                    </option>
                </select>
            </div>
            <div>
                Input Fields
                 <div>
                    <input type="text" v-model="newInputInformationFieldName" placeholder="Input field name" @keyup.enter="newInformationField(application.id)"/>
                    <button @click="newInformationField(application.id)">Add</button>
                </div>
                <div v-for="informationField in application.inputInformationFields.filter((informationField) => informationField.position === 0)">
                    {{ informationField.fieldName }}
                    <button @click="deleteInformationField(application.id, informationField.id)">X</button>
                </div>
            </div>
        </div>


        <div>
            Output Information Fields
            <div>
                Forwarded Data
                <div v-for="informationField in application.outputInformationFields.filter((informationField) => informationField.position > 0)">
                    {{ informationField.fieldName }}
                    <button @click="deleteInformationField(application.id, informationField.id, 'output')">X</button>
                </div>
                <select v-model="forwardedInformationField" @change="addForwardedInformationField(application.id)">
                    <option value="">-- Select Information Field --</option>
                    <option
                        v-for="accessibleInformationField in application.inputInformationFields"
                        :key="accessibleInformationField.id"
                        :value="accessibleInformationField"
                        :disabled="application.outputInformationFields.some((informationField) => informationField.id === accessibleInformationField.id)"
                    >
                        {{ accessibleInformationField.fieldName }}
                    </option>
                </select>
            </div>
            <div>
                Output Fields
                 <div>
                    <input type="text" v-model="newOutputInformationFieldName" placeholder="Input field name" @keyup.enter="newInformationField(application.id, 'output')"/>
                    <button @click="newInformationField(application.id, 'output')">Add</button>
                </div>
                <div v-for="informationField in application.outputInformationFields.filter((informationField) => informationField.position === 0)">
                    {{ informationField.fieldName }}
                    <button @click="deleteInformationField(application.id, informationField.id, 'output')">X</button>
                </div>
            </div>
        </div>
    </div>
</template>