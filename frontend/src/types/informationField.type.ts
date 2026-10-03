import type { ResourceType } from "./resource.type";


export type AddInformationFieldRequest =
    | {
          fieldName: string;
      }
    | {
          informationFieldId: string;
          sourceResourceId: string;
          sourceResourceType: ResourceType;
      };



export interface InformationField {
    id: string;
    fieldName: string;
}

export interface InformationFieldReference {
    informationFieldId: string;
    position: number;
}

export interface ResolvedInformationFieldReference {
    informationField: InformationField;
    position: number;
}

export interface AccessibleInformationField extends InformationField {
    accessibleFromId: string;
    accessibleFromType: ResourceType;
}