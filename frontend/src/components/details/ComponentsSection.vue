<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { vCollapsible } from '../../directives/collapsible';
    import { useComponentStore } from '../../stores/resources/component.store';
    import { useViewStore } from '../../stores/canvas/view.store';
    import { useUIStore } from '../../stores/canvas/ui.store';
    import { FILE_TYPES, getComponentIcon, type ComponentKind, type FileType } from '../../types/component.types';

    // The components of a resource: the scripts that run in an application, or the files of a file location
    // (a file location only stores files, a script is a file as well). In a file location they are called files
    const props = defineProps<{
        resourceId: string;
        resourceType: 'application' | 'fileLocation';
    }>();

    const noun = computed(() => props.resourceType === 'fileLocation' ? 'file' : 'component');

    const componentStore = useComponentStore();
    const viewStore = useViewStore();
    const UIStore = useUIStore();

    // Scripts run in applications and file locations, files are stored in file locations
    const allowedKinds = computed<ComponentKind[]>(() =>
        props.resourceType === 'fileLocation' ? ['script', 'file'] : ['script']
    );

    const components = computed(() =>
        componentStore.getResourceComponents(props.resourceId)
            .slice()
            .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name))
    );

    const newName = ref('');
    const newKind = ref<ComponentKind>('script');
    const newFileType = ref<FileType>('excel');

    async function addComponent() {
        const name = newName.value.trim();
        if (!name) return;
        await componentStore.createComponent(props.resourceId, newKind.value, name, newKind.value === 'file' ? newFileType.value : undefined);
        newName.value = '';
    }

    // Opens the details of the component by selecting its node on the canvas
    function openComponent(componentId: string) {
        const viewNode = viewStore.viewNodes.find(node => node.entityId === componentId);
        if (viewNode) UIStore.setSelectedEntity(viewNode.id, 'node');
    }
</script>

<template>
    <section v-collapsible class="detail-section">
        <div class="detail-section-title">
            <span>{{ resourceType === 'fileLocation' ? 'Files' : 'Components' }}</span>
            <span class="detail-count">{{ components.length }}</span>
        </div>

        <div v-if="!components.length" class="detail-empty">
            {{ resourceType === 'fileLocation'
                ? 'No files yet. Add the scripts and other files stored here.'
                : 'No scripts yet. Add the scripts that run in this application.' }}
        </div>

        <div
            v-for="component in components"
            :key="component.id"
            class="detail-row component-row"
            title="Open the details"
            @click="openComponent(component.id)"
        >
            <i :class="getComponentIcon(component)" class="detail-row-icon" :style="{ color: component.kind === 'script' ? '#4f46e5' : '#ea580c' }" />
            <span class="detail-row-name">{{ component.name }}</span>
            <span class="detail-count">{{ component.kind === 'script' ? 'Script' : 'File' }}</span>
            <button
                type="button"
                class="detail-delete-button"
                :title="`Delete ${noun}`"
                @click.stop="componentStore.deleteComponent(component.id)"
            >
                ×
            </button>
        </div>

        <div class="detail-add-row">
            <input
                v-model="newName"
                type="text"
                class="detail-input"
                :placeholder="newKind === 'script' ? '+ New script' : '+ New file'"
                @keyup.enter="addComponent"
            />
            <select
                v-if="allowedKinds.length > 1"
                v-model="newKind"
                class="detail-select kind-select"
                :title="`Kind of ${noun}`"
            >
                <option value="script">Script</option>
                <option value="file">File</option>
            </select>
            <select
                v-if="newKind === 'file'"
                v-model="newFileType"
                class="detail-select kind-select"
                title="File type"
            >
                <option v-for="option in FILE_TYPES" :key="option.fileType" :value="option.fileType">
                    {{ option.label }}
                </option>
            </select>
            <button
                type="button"
                class="detail-add-button"
                :title="`Add ${noun}`"
                :disabled="!newName.trim()"
                @click="addComponent"
            >
                <i class="pi pi-plus" />
            </button>
        </div>
    </section>
</template>

<style scoped>
.component-row {
    cursor: pointer;
}

.kind-select {
    flex: 0 0 auto;
    width: auto;
}
</style>
