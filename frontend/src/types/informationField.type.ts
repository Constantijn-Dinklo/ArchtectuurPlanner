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
    position: number;
    sourceResourceId?: string;
    targetResourceIds?: string[];
}

export interface AccessibleInformationField extends InformationField {
    accessibleFromId: string;
    accessibleFromType: ResourceType;
}