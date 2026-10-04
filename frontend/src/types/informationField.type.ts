import type { ResourceType } from "./resource.type";


export type AddInformationFieldRequest =
    | {
          fieldName: string;
      }
    | {
          informationFieldId: string;
          sourceResourceId: string;
          sourceResourceType: ResourceType;
          // The connection the information comes through, when the user picked one
          viaConnectionType?: 'api' | 'script' | 'database' | 'human' | null;
          viaConnectionId?: string | null;
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
    // The output objects of the source the field is part of, when it is received as part of an object
    objectNames?: string[];
}