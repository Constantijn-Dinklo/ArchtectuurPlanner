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
// one source; it is never set automatically, and information without a source is shown with a warning.
// A file is its file location plus the file as componentId
export interface InformationSource {
    resourceId: string;
    resourceType: ResourceType;
    componentId?: string | null;
}

// What can be picked as a source: a resource, or a file in a file location
export type SourceTarget = Pick<InformationSource, 'resourceId' | 'componentId'>;

// How a piece of information comes into being at its source
export type SourceMethod = 'input' | 'computed' | 'imported' | 'generated' | 'other';

export const SOURCE_METHODS: { method: SourceMethod, label: string }[] = [
    { method: 'input', label: 'Input' },
    { method: 'computed', label: 'Computed' },
    { method: 'imported', label: 'Imported' },
    { method: 'generated', label: 'Generated' },
    { method: 'other', label: 'Other' }
];

export interface InformationField {
    id: string;
    fieldName: string;
    source: InformationSource | null;
    sourceMethod: SourceMethod | null;
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