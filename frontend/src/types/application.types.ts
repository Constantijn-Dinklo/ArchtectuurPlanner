import type { Node } from '@vue-flow/core';

import type { InformationFieldReference, ResolvedInformationFieldReference } from "./informationField.type";
import type { InformationObjectReference, ResolvedInformationObjectReference } from "./informationObject.type";
import type { BaseResource } from "./resource.type";

export interface Application extends BaseResource {
    type: 'application';
    version?: string;
    inputInformationObjectRefs: InformationObjectReference[];
    outputInformationObjectRefs: InformationObjectReference[];
    inputInformationFieldRefs: InformationFieldReference[];
    outputInformationFieldRefs: InformationFieldReference[];
}

export interface ResolvedApplication
    extends Omit<
        Application,
        | 'inputInformationObjectRefs'
        | 'outputInformationObjectRefs'
        | 'inputInformationFieldRefs'
        | 'outputInformationFieldRefs'
    > {
    inputInformationObjects: ResolvedInformationObjectReference[];
    outputInformationObjects: ResolvedInformationObjectReference[];

    inputInformationFields: ResolvedInformationFieldReference[];
    outputInformationFields: ResolvedInformationFieldReference[];
}

export interface ApplicationDto {
    id: string;
    name: string;
    version: string;

    inputInformationFields: InformationFieldReference[];
    outputInformationFields: InformationFieldReference[];

    inputInformationObjects: InformationObjectReference[];
    outputInformationObjects: InformationObjectReference[];
}

export type ApplicationNode = Node<ApplicationNodeData>;

export interface ApplicationNodeData {
    label: string;
    resourceId: string;

    inputInformationFields?: ResolvedInformationFieldReference[];
    outputInformationFields?: ResolvedInformationFieldReference[];

    inputInformationObjects?: ResolvedInformationObjectReference[];
    outputInformationObjects?: ResolvedInformationObjectReference[];
}