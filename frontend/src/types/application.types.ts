import type { Node } from '@vue-flow/core';

import type { InformationFieldReference, ResolvedInformationFieldReference } from "./informationField.type";
import type { InformationObjectReference, ResolvedInformationObjectReference } from "./informationObject.type";
import type { BaseResource } from "./resource.type";

export type ApplicationHosting = 'unknown' | 'saas' | 'onPremise';

export const APPLICATION_HOSTINGS: { hosting: ApplicationHosting, label: string }[] = [
    { hosting: 'unknown', label: 'Unknown' },
    { hosting: 'saas', label: 'SaaS' },
    { hosting: 'onPremise', label: 'On-premise' }
];

export interface Application extends BaseResource {
    type: 'application';
    version?: string;
    // The organisation that develops the application
    developer?: string;
    // Whether the application is used as a service (SaaS) or runs on our own servers (on-premise)
    hosting?: ApplicationHosting;
    // For a SaaS application: where it can be found
    websiteUrl?: string;
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
    developer?: string;
    hosting?: ApplicationHosting;
    websiteUrl?: string;

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

    // Only at the detail level of detail: the endpoints of the application
    endpoints?: ApplicationNodeEndpoint[];
}

export interface ApplicationNodeEndpoint {
    id: string;
    name: string;
    icon: string;
    objectNames: string[];
    fieldNames: string[];
}