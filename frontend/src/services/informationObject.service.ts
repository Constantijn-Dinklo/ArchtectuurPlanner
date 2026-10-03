import api from "../helpers/axios";
import { useInformationFieldStore } from "../stores/information/informationField.store";
import { useInformationObjectStore } from "../stores/information/informationObject.store";
import { useApplicationStore } from "../stores/resources/application.store";
import { mapApplicationDto } from "../mappers/application.mapper";
import type { ApplicationDto } from "../types/application.types";
import type { InformationField } from "../types/informationField.type";
import type { InformationObject } from "../types/informationObject.type";

type AddInformationObjectFieldRequest =
    | {
          fieldName: string;
      }
    | {
          informationFieldId: string;
      };

interface AddInformationObjectFieldResponse {
    informationObject: InformationObject;
    informationFields: InformationField[];
    application?: ApplicationDto;
}

// The application whose standalone field list the field is moved out of or into
export interface FieldApplicationOrigin {
    applicationId: string;
    direction: 'input' | 'output';
}

interface DeleteInformationObjectFieldResponse {
    informationObject: InformationObject;
    application?: ApplicationDto;
}

export function useInformationObjectService() {
    const informationObjectStore = useInformationObjectStore();
    const informationFieldStore = useInformationFieldStore();
    const applicationStore = useApplicationStore();

    async function addInformationFieldToInformationObject(
        informationObjectId: string,
        informationField: AddInformationObjectFieldRequest,
        fromApplication?: FieldApplicationOrigin
    ) {
        const res = await api.post<AddInformationObjectFieldResponse>(
            `/informationObjects/${informationObjectId}/informationFields`,
            {
                informationField,
                fromApplication
            }
        );
        if (res.data.application) {
            applicationStore.setApplication(mapApplicationDto(res.data.application));
        }
        // Fields first, so the object never references a field that is not in the store yet
        informationFieldStore.setInformationFields(res.data.informationFields);
        informationObjectStore.setInformationObjects([res.data.informationObject]);
    }

    async function deleteInformationFieldFromInformationObject(
        informationObjectId: string,
        informationFieldId: string,
        toApplication?: FieldApplicationOrigin
    ) {
        const res = await api.delete<DeleteInformationObjectFieldResponse>(
            `/informationObjects/${informationObjectId}/informationFields/${informationFieldId}`,
            {
                params: toApplication
            }
        );
        informationObjectStore.setInformationObjects([res.data.informationObject]);
        if (res.data.application) {
            applicationStore.setApplication(mapApplicationDto(res.data.application));
        }
    }

    // fromApplication: the field is removed from the standalone list of this application
    // toApplication: the field is put back into the standalone list of this application
    async function moveInformationFieldToInformationObject(
        informationFieldId: string,
        fromInformationObjectId: string | undefined,
        toInformationObjectId: string | undefined,
        fromApplication?: FieldApplicationOrigin,
        toApplication?: FieldApplicationOrigin
    ) {
        if (fromInformationObjectId === toInformationObjectId) return;

        if (toInformationObjectId) {
            await addInformationFieldToInformationObject(toInformationObjectId, { informationFieldId }, fromApplication);
        }
        if (fromInformationObjectId) {
            await deleteInformationFieldFromInformationObject(fromInformationObjectId, informationFieldId, toApplication);
        }
    }

    return { addInformationFieldToInformationObject, deleteInformationFieldFromInformationObject, moveInformationFieldToInformationObject }
}
