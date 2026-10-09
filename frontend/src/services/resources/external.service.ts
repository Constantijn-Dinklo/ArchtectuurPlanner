import api from "../../helpers/axios";
import { useExternalStore } from "../../stores/resources/external.store";
import { useViewStore } from "../../stores/canvas/view.store";
import { useInformationFieldStore } from "../../stores/information/informationField.store";
import { useInformationObjectStore } from "../../stores/information/informationObject.store";
import { mapExternalDto, type External, type ExternalDto } from "../../types/external.types";
import type { InformationField } from "../../types/informationField.type";
import type { InformationObject } from "../../types/informationObject.type";

interface ExternalWithInformationResponse {
    external: ExternalDto;
    informationFields: InformationField[];
    informationObjects: InformationObject[];
}

interface GetExternalsResponse {
    externals: ExternalDto[];
    informationFields: InformationField[];
    informationObjects: InformationObject[];
}

export type ProvidedFieldRequest = { fieldName: string } | { informationFieldId: string };
export type ProvidedObjectRequest = { objectName: string } | { informationObjectId: string };

export function useExternalService() {
    const externalStore = useExternalStore();
    const viewStore = useViewStore();
    const informationFieldStore = useInformationFieldStore();
    const informationObjectStore = useInformationObjectStore();

    // Fields first, so an external never references a field that is not in the store yet
    function setInformation(informationFields: InformationField[], informationObjects: InformationObject[]) {
        informationFieldStore.setInformationFields(informationFields);
        informationObjectStore.setInformationObjects(informationObjects);
    }

    function setExternalWithInformation(data: ExternalWithInformationResponse) {
        setInformation(data.informationFields, data.informationObjects);
        externalStore.setExternal(mapExternalDto(data.external));
    }

    async function fetchExternals() {
        const res = await api.get<GetExternalsResponse>('/externals');
        setInformation(res.data.informationFields, res.data.informationObjects);
        externalStore.setExternals(res.data.externals.map(mapExternalDto));
    }

    async function createExternal(name: string) {
        const res = await api.post<{ external: ExternalDto, viewNode: any }>('/externals', {
            name,
            viewId: viewStore.currentViewId
        });
        externalStore.setExternal(mapExternalDto(res.data.external));
        viewStore.addViewNode(res.data.viewNode);
    }

    async function updateExternal(id: string, patch: Partial<Pick<External, 'name' | 'externalOrganisation' | 'owner' | 'kind' | 'description'>>) {
        const res = await api.patch<ExternalDto>(`/externals/${id}`, patch);
        externalStore.setExternal(mapExternalDto(res.data));
    }

    async function deleteExternal(id: string) {
        const res = await api.delete<{ resourceId: string, viewNodeId?: string }>(`/externals/${id}`);
        externalStore.removeExternal(id);
        if (res.data.viewNodeId) {
            viewStore.removeViewNode(res.data.viewNodeId);
        }
    }

    async function addProvidedInformationField(id: string, informationField: ProvidedFieldRequest) {
        const res = await api.post<ExternalWithInformationResponse>(`/externals/${id}/providedInformationFields`, { informationField });
        setExternalWithInformation(res.data);
    }

    async function removeProvidedInformationField(id: string, informationFieldId: string) {
        const res = await api.delete<ExternalWithInformationResponse>(`/externals/${id}/providedInformationFields/${informationFieldId}`);
        setExternalWithInformation(res.data);
    }

    async function addProvidedInformationObject(id: string, informationObject: ProvidedObjectRequest) {
        const res = await api.post<ExternalWithInformationResponse>(`/externals/${id}/providedInformationObjects`, { informationObject });
        setExternalWithInformation(res.data);
    }

    async function removeProvidedInformationObject(id: string, informationObjectId: string) {
        const res = await api.delete<ExternalWithInformationResponse>(`/externals/${id}/providedInformationObjects/${informationObjectId}`);
        setExternalWithInformation(res.data);
    }

    return {
        fetchExternals,
        createExternal,
        updateExternal,
        deleteExternal,
        addProvidedInformationField,
        removeProvidedInformationField,
        addProvidedInformationObject,
        removeProvidedInformationObject
    };
}
