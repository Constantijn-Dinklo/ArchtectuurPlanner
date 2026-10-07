import { defineStore } from "pinia";
import { ref } from "vue";
import api from "../helpers/axios";
import type { ResourceType } from "../types/resource.type";

export type EndpointType = 'dashboard' | 'map' | 'download' | 'report' | 'screen' | 'other';

export const ENDPOINT_TYPES: { type: EndpointType, label: string, icon: string }[] = [
    { type: 'dashboard', label: 'Dashboard', icon: 'pi pi-chart-bar' },
    { type: 'map', label: 'Map', icon: 'pi pi-map' },
    { type: 'download', label: 'Download', icon: 'pi pi-download' },
    { type: 'report', label: 'Report', icon: 'pi pi-file' },
    { type: 'screen', label: 'Screen', icon: 'pi pi-desktop' },
    { type: 'other', label: 'Other', icon: 'pi pi-flag' }
];

export function getEndpointTypeInfo(type: EndpointType) {
    return ENDPOINT_TYPES.find(endpointType => endpointType.type === type) ?? ENDPOINT_TYPES[ENDPOINT_TYPES.length - 1]!;
}

// A place inside a resource where information is used by people, for example a dashboard, a map or a download
export interface Endpoint {
    id: string;
    resourceId: string;
    resourceType: ResourceType;

    name: string;
    type: EndpointType;

    // The information of the resource that is shown or used in the endpoint
    informationFieldIds: string[];
    informationObjectIds: string[];
}

export const useEndpointStore = defineStore('endpoint', () => {
    const endpoints = ref<Endpoint[]>([]);

    async function fetchEndpoints() {
        const res = await api.get<Endpoint[]>('/endpoints');
        endpoints.value = res.data;
    }

    function setEndpoint(updated: Endpoint) {
        const existing = endpoints.value.find(endpoint => endpoint.id === updated.id);
        if(existing) {
            Object.assign(existing, updated);
        }
    }

    function getResourceEndpoints(resourceId: string) {
        return endpoints.value.filter(endpoint => endpoint.resourceId === resourceId);
    }

    async function createEndpoint(resourceId: string, resourceType: ResourceType, name: string, type: EndpointType) {
        const res = await api.post<Endpoint>('/endpoints', { resourceId, resourceType, name, type });
        endpoints.value.push(res.data);
    }

    async function updateEndpoint(id: string, patch: Partial<Pick<Endpoint, 'name' | 'type'>>) {
        const res = await api.patch<Endpoint>(`/endpoints/${id}`, patch);
        setEndpoint(res.data);
    }

    async function deleteEndpoint(id: string) {
        await api.delete(`/endpoints/${id}`);
        endpoints.value = endpoints.value.filter(endpoint => endpoint.id !== id);
    }

    async function addInformationField(id: string, informationFieldId: string) {
        const res = await api.post<Endpoint>(`/endpoints/${id}/informationFields`, { informationFieldId });
        setEndpoint(res.data);
    }

    async function removeInformationField(id: string, informationFieldId: string) {
        const res = await api.delete<Endpoint>(`/endpoints/${id}/informationFields/${informationFieldId}`);
        setEndpoint(res.data);
    }

    async function addInformationObject(id: string, informationObjectId: string) {
        const res = await api.post<Endpoint>(`/endpoints/${id}/informationObjects`, { informationObjectId });
        setEndpoint(res.data);
    }

    async function removeInformationObject(id: string, informationObjectId: string) {
        const res = await api.delete<Endpoint>(`/endpoints/${id}/informationObjects/${informationObjectId}`);
        setEndpoint(res.data);
    }

    return {
        endpoints,
        fetchEndpoints,
        getResourceEndpoints,
        createEndpoint,
        updateEndpoint,
        deleteEndpoint,
        addInformationField,
        removeInformationField,
        addInformationObject,
        removeInformationObject
    }
});
