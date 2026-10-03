import type { InformationField, InformationFieldReference } from "./informationField.type";
import type { ResourceType } from "./resource.type";

export type AddInformationObjectRequest =
    | {
          objectName: string;
      }
    | {
          informationObjectId: string;
          sourceResourceId: string;
          sourceResourceType: ResourceType;
      };

export interface InformationObject {
    id: string;
    objectName: string;
    informationFieldIds: string[];
}

export interface ResolvedInformationObject
    extends Omit<InformationObject, 'informationFieldIds'> {
    informationFields: InformationField[];
}

export interface AccessibleInformationObject extends ResolvedInformationObject {
    accessibleFromId: string;
    accessibleFromType: ResourceType;
}

export interface InformationObjectReference {
    informationObjectId: string;
    position: number;
}

export interface ResolvedInformationObjectReference {
    informationObject: ResolvedInformationObject;
    position: number;
}

export interface InformationObjectDto {
    id: string;
    objectName: string;
    version: string;

    inputInformationFields: InformationFieldReference[];
    outputInformationFields: InformationFieldReference[];

    inputInformationObjects: InformationObjectReference[];
    outputInformationObjects: InformationObjectReference[];
}