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
          viaConnectionType?: 'api' | 'script' | 'database' | 'other' | 'component' | null;
          viaConnectionId?: string | null;
      };



// The resource a piece of information originates from. Every InformationField and InformationObject has at most
// one source; it is never set automatically, and information without a source is shown with a warning
export interface InformationSource {
    resourceId: string;
    resourceType: ResourceType;
}

export interface InformationField {
    id: string;
    fieldName: string;
    source: InformationSource | null;
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