import { defineStore } from "pinia";
import { ref } from "vue";
import { useToast } from "primevue";
import api from "../../helpers/axios";
import type { Component, ComponentEndTarget, ComponentKind, FileType, InformationSlot } from "../../types/component.types";
import type { InformationField } from "../../types/informationField.type";
import type { InformationObject } from "../../types/informationObject.type";
import { useInformationFieldStore } from "../information/informationField.store";
import { useInformationObjectStore } from "../information/informationObject.store";
import { useViewStore } from "../canvas/view.store";
import { refreshReceivedInformation } from "../../services/receivedInformation";
import { useApplicationService } from "../../services/resources/application.service";
import { useTableStore } from "./table.store";

interface ComponentWithInformationResponse {
    component: Component;
    informationFields: InformationField[];
    informationObjects: InformationObject[];
}

interface GetComponentsResponse {
    components: Component[];
    informationFields: InformationField[];
    informationObjects: InformationObject[];
}

// The components of the resources: scripts in applications and file locations, files in file locations
export const useComponentStore = defineStore('component', () => {
    const components = ref<Component[]>([]);

    const toast = useToast();

    // Fields first, so a component never references a field that is not in the store yet
    function setInformation(informationFields: InformationField[], informationObjects: InformationObject[]) {
        useInformationFieldStore().setInformationFields(informationFields);
        useInformationObjectStore().setInformationObjects(informationObjects);
    }

    function setComponent(component: Component) {
        const existing = components.value.find(candidate => candidate.id === component.id);
        if (existing) {
            Object.assign(existing, component);
        } else {
            components.value.push(component);
        }
    }

    async function withErrorToast(request: () => Promise<void>) {
        try {
            await request();
        }
        catch (error: any) {
            toast.add({
                severity: 'warn',
                summary: error.response?.data?.error ?? 'Could not update the component',
                life: 3000
            });
        }
    }

    function getComponent(id: string) {
        return components.value.find(component => component.id === id);
    }

    function getResourceComponents(resourceId: string) {
        return components.value.filter(component => component.resourceId === resourceId);
    }

    // The scripts that read from one of the sources and write to one of the targets.
    // A file in a file location counts as its file location, a table counts as itself
    function getScriptsBetween(sourceIds: string[], targetIds: string[]) {
        return components.value.filter(component =>
            component.kind === 'script' &&
            component.inputs.some(end => sourceIds.includes(end.resourceId)) &&
            component.outputs.some(end => targetIds.includes(end.resourceId))
        );
    }

    async function fetchComponents() {
        const res = await api.get<GetComponentsResponse>('/components');
        setInformation(res.data.informationFields, res.data.informationObjects);
        components.value = res.data.components;

        // Components that were removed with their resource no longer have a node on the canvas
        const viewStore = useViewStore();
        const componentIds = new Set(components.value.map(component => component.id));
        viewStore.viewNodes
            .filter(viewNode => viewNode.entityType === 'component' && !componentIds.has(viewNode.entityId))
            .forEach(viewNode => viewStore.removeViewNode(viewNode.id));
    }

    function createComponent(resourceId: string, kind: ComponentKind, name: string, fileType?: FileType) {
        return withErrorToast(async () => {
            const viewStore = useViewStore();
            const res = await api.post<{ component: Component, viewNode: any }>('/components', {
                resourceId,
                kind,
                name,
                fileType,
                viewId: viewStore.currentViewId
            });
            setComponent(res.data.component);
            viewStore.addViewNode(res.data.viewNode);
        });
    }

    function updateComponent(id: string, patch: Partial<Pick<Component, 'name' | 'description' | 'fileType'>>) {
        return withErrorToast(async () => {
            const res = await api.patch<ComponentWithInformationResponse>(`/components/${id}`, patch);
            setComponent(res.data.component);
        });
    }

    function deleteComponent(id: string) {
        return withErrorToast(async () => {
            const res = await api.delete<{ componentId: string, viewNodeId?: string }>(`/components/${id}`);
            components.value = components.value.filter(component => component.id !== id);
            // Scripts that read from or wrote to this component no longer do
            for (const component of components.value) {
                component.inputs = component.inputs.filter(end => end.componentId !== id);
                component.outputs = component.outputs.filter(end => end.componentId !== id);
            }
            if (res.data.viewNodeId) {
                useViewStore().removeViewNode(res.data.viewNodeId);
            }
            // The relations through a removed script are gone as well
            await refreshReceivedInformation();
        });
    }

    async function apply(request: Promise<{ data: ComponentWithInformationResponse }>) {
        const res = await request;
        setInformation(res.data.informationFields, res.data.informationObjects);
        setComponent(res.data.component);
    }

    function addEnd(id: string, side: 'inputs' | 'outputs', end: ComponentEndTarget) {
        return withErrorToast(() => apply(api.post(`/components/${id}/${side}`, end)));
    }

    // What a script reads and writes decides the relations it carries, and an application, table or external element
    // it writes to gets the information. The backend keeps those up to date, so reload them after such a change
    async function applyAndRefresh(request: Promise<{ data: ComponentWithInformationResponse }>) {
        await apply(request);
        await Promise.all([
            // A file the script writes to contains what is written
            fetchComponents(),
            refreshReceivedInformation(),
            useApplicationService().fetchApplications(),
            useTableStore().fetchTables()
        ]);
    }

    // The information a script reads from one end or writes to one end; it also goes in the inputs or outputs of the script
    function addEndInformationField(id: string, side: 'inputs' | 'outputs', index: number, informationField: { fieldName: string } | { informationFieldId: string }) {
        return withErrorToast(() => applyAndRefresh(api.post(`/components/${id}/${side}/${index}/information/fields`, { informationField })));
    }

    function removeEndInformationField(id: string, side: 'inputs' | 'outputs', index: number, informationFieldId: string) {
        return withErrorToast(() => applyAndRefresh(api.delete(`/components/${id}/${side}/${index}/information/fields/${informationFieldId}`)));
    }

    function addEndInformationObject(id: string, side: 'inputs' | 'outputs', index: number, informationObject: { objectName: string } | { informationObjectId: string }) {
        return withErrorToast(() => applyAndRefresh(api.post(`/components/${id}/${side}/${index}/information/objects`, { informationObject })));
    }

    function removeEndInformationObject(id: string, side: 'inputs' | 'outputs', index: number, informationObjectId: string) {
        return withErrorToast(() => applyAndRefresh(api.delete(`/components/${id}/${side}/${index}/information/objects/${informationObjectId}`)));
    }

    function removeEnd(id: string, side: 'inputs' | 'outputs', index: number) {
        return withErrorToast(() => applyAndRefresh(api.delete(`/components/${id}/${side}/${index}`)));
    }

    // slot: 'input' or 'output' for a script, 'contains' for a file
    function addInformationField(id: string, slot: InformationSlot, informationField: { fieldName: string } | { informationFieldId: string }) {
        return withErrorToast(() => apply(api.post(`/components/${id}/information/fields`, { informationField, slot })));
    }

    function removeInformationField(id: string, slot: InformationSlot, informationFieldId: string) {
        return withErrorToast(() => apply(api.delete(`/components/${id}/information/fields/${informationFieldId}`, { params: { slot } })));
    }

    function addInformationObject(id: string, slot: InformationSlot, informationObject: { objectName: string } | { informationObjectId: string }) {
        return withErrorToast(() => apply(api.post(`/components/${id}/information/objects`, { informationObject, slot })));
    }

    function removeInformationObject(id: string, slot: InformationSlot, informationObjectId: string) {
        return withErrorToast(() => apply(api.delete(`/components/${id}/information/objects/${informationObjectId}`, { params: { slot } })));
    }

    return {
        components,
        getComponent,
        getResourceComponents,
        getScriptsBetween,
        fetchComponents,
        createComponent,
        updateComponent,
        deleteComponent,
        addEnd,
        removeEnd,
        addEndInformationField,
        removeEndInformationField,
        addEndInformationObject,
        removeEndInformationObject,
        addInformationField,
        removeInformationField,
        addInformationObject,
        removeInformationObject
    };
});
