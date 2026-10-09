import type { InformationFieldReference, ResolvedInformationFieldReference } from "./informationField.type";
import type { InformationObjectReference, ResolvedInformationObjectReference } from "./informationObject.type";
import type { BaseResource } from "./resource.type";

export type ExternalKind = 'unknown' | 'system' | 'database' | 'file' | 'organisation';

export const EXTERNAL_KINDS: { kind: ExternalKind, label: string, icon: string }[] = [
    { kind: 'unknown', label: 'Unknown', icon: 'pi pi-globe' },
    { kind: 'system', label: 'System', icon: 'pi pi-server' },
    { kind: 'database', label: 'Database', icon: 'pi pi-database' },
    { kind: 'file', label: 'File exchange', icon: 'pi pi-file' },
    { kind: 'organisation', label: 'Organisation', icon: 'pi pi-building' }
];

export function getExternalKindInfo(kind: ExternalKind) {
    return EXTERNAL_KINDS.find(externalKind => externalKind.kind === kind) ?? EXTERNAL_KINDS[0]!;
}

// An element outside the domain (company). It is a black box: we only know which information we send to it
// (received) and which information we read from it (provided), not what happens inside.
export interface External extends BaseResource {
    type: 'external';
    externalOrganisation: string;
    owner: string;
    kind: ExternalKind;
    description: string;

    providedInformationFieldRefs: InformationFieldReference[];
    providedInformationObjectRefs: InformationObjectReference[];
    receivedInformationFieldRefs: InformationFieldReference[];
    receivedInformationObjectRefs: InformationObjectReference[];
}

export interface ResolvedExternal
    extends Omit<
        External,
        | 'providedInformationFieldRefs'
        | 'providedInformationObjectRefs'
        | 'receivedInformationFieldRefs'
        | 'receivedInformationObjectRefs'
    > {
    providedInformationFields: ResolvedInformationFieldReference[];
    providedInformationObjects: ResolvedInformationObjectReference[];
    receivedInformationFields: ResolvedInformationFieldReference[];
    receivedInformationObjects: ResolvedInformationObjectReference[];
}

export interface ExternalDto {
    id: string;
    name: string;
    externalOrganisation: string;
    owner: string;
    kind: ExternalKind;
    description: string;

    providedInformationFields: InformationFieldReference[];
    providedInformationObjects: InformationObjectReference[];
    receivedInformationFields: InformationFieldReference[];
    receivedInformationObjects: InformationObjectReference[];
}

export function mapExternalDto(external: ExternalDto): External {
    return {
        id: external.id,
        type: 'external',
        name: external.name,
        externalOrganisation: external.externalOrganisation ?? '',
        owner: external.owner ?? '',
        kind: external.kind ?? 'unknown',
        description: external.description ?? '',

        providedInformationFieldRefs: external.providedInformationFields ?? [],
        providedInformationObjectRefs: external.providedInformationObjects ?? [],
        receivedInformationFieldRefs: external.receivedInformationFields ?? [],
        receivedInformationObjectRefs: external.receivedInformationObjects ?? []
    };
}
