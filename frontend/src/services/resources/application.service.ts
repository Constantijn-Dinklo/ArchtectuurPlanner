import { useApplicationStore } from "../../stores/resources/application.store";
import { useViewStore } from "../../stores/canvas/view.store";
import api from "../../helpers/axios";
import type { AddInformationObjectRequest, InformationObject } from "../../types/informationObject.type";
import type { AddInformationFieldRequest, InformationField } from "../../types/informationField.type";
import { useInformationFieldStore } from "../../stores/information/informationField.store";
import { useInformationObjectStore } from "../../stores/information/informationObject.store";
import type { ApplicationDto } from "../../types/application.types";
import { mapApplicationDto } from "../../mappers/application.mapper";

interface GetApplicationsResponse {
    applications: ApplicationDto[];
    informationObjects: InformationObject[];
    informationFields: InformationField[];
}

interface UpdateApplicationInformationFieldResponse {
    application: ApplicationDto;
    informationFields: InformationField[];
}

interface UpdateApplicationInformationObjectResponse {
    application: ApplicationDto;
    informationObjects: InformationObject[];
}

export function useApplicationService() {
    const applicationStore = useApplicationStore();
    const informationObjectStore = useInformationObjectStore();
    const informationFieldStore = useInformationFieldStore();
    const viewStore = useViewStore();

    async function fetchApplications() {
        const res = await api.get<GetApplicationsResponse>(
            '/applications'
        );

        applicationStore.setApplications(
            res.data.applications.map(mapApplicationDto)
        );

        informationObjectStore.setInformationObjects(
            res.data.informationObjects
        );

        informationFieldStore.setInformationFields(
            res.data.informationFields
        );
    }

    async function createAppliction(name: string) {
        const currentViewId = viewStore.currentViewId;
        const res = await applicationStore.createAppliction(name, currentViewId);
        viewStore.addViewNode(res.viewNode);
    }

    async function deleteApplication(applicationId: string) {
        const res = await applicationStore.deleteApplication(applicationId);
        viewStore.removeViewNode(res.viewNodeId);
    }

    async function addApplicationInformationField(
        applicationId: string,
        informationField: AddInformationFieldRequest,
        direction: 'input' | 'output' = 'input'
    ) { 
        const res = await api.post<UpdateApplicationInformationFieldResponse>(
            `/applications/${applicationId}/informationFields`,
            {
                informationField,
                direction
            }
        );
        applicationStore.setApplication(mapApplicationDto(res.data.application));
        informationFieldStore.setInformationFields(res.data.informationFields);
    }

    async function deleteApplicationInformationField(applicationId: string, informationFieldId: string, direction: 'input' | 'output' = 'input') {   
        const res = await api.patch(
            `/applications/${applicationId}/informationFields`,
            {
                informationFieldId,
                direction
            }
        );
        applicationStore.setApplication(mapApplicationDto(res.data));
    }

    async function addApplictionInformationObject(
        applicationId: string, 
        informationObject: AddInformationObjectRequest,
        direction: 'input' | 'output' = 'input'
    ) {   
        const res = await api.post<UpdateApplicationInformationObjectResponse>(
            `/applications/${applicationId}/informationObjects`,
            {
                informationObject,
                direction
            }
        );
        applicationStore.setApplication(mapApplicationDto(res.data.application));
        informationObjectStore.setInformationObjects(res.data.informationObjects);
    }

    async function deleteApplicationInformationObject(applicationId: string, informationObjectId: string, direction: 'input' | 'output' = 'input') {
        const res = await api.patch(
            `/applications/${applicationId}/informationObjects`,
            {
                informationObjectId,
                direction
            }
        );
        applicationStore.setApplication(mapApplicationDto(res.data));
    }

    return { fetchApplications, createAppliction, deleteApplication, addApplicationInformationField, deleteApplicationInformationField, addApplictionInformationObject, deleteApplicationInformationObject }
}