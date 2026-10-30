// Levels of the architecture: a host (server) holds resources, a resource holds components.
// A component is a part of a resource: a script that runs in an application or file location,
// or a file in a file location. Components never contain other components.
export type ComponentKind = 'script' | 'file';

export type FileType = 'excel' | 'csv' | 'word' | 'pdf' | 'other';

export const FILE_TYPES: { fileType: FileType, label: string, icon: string }[] = [
    { fileType: 'excel', label: 'Excel', icon: 'pi pi-file-excel' },
    { fileType: 'csv', label: 'CSV', icon: 'pi pi-file' },
    { fileType: 'word', label: 'Word', icon: 'pi pi-file-word' },
    { fileType: 'pdf', label: 'PDF', icon: 'pi pi-file-pdf' },
    { fileType: 'other', label: 'Other', icon: 'pi pi-file' }
];

export function getFileTypeInfo(fileType: FileType) {
    return FILE_TYPES.find(option => option.fileType === fileType) ?? FILE_TYPES[FILE_TYPES.length - 1]!;
}

export function getComponentIcon(component: Pick<Component, 'kind' | 'fileType'>) {
    return component.kind === 'script' ? 'pi pi-code' : getFileTypeInfo(component.fileType).icon;
}

// One side of what a script reads from or writes to: a resource (a table is a resource as well),
// or a component inside a resource, like a file in a file location.
// The information is what the script reads from this end or writes to it; it is always part of the inputs or outputs of the script as well
export interface ComponentEnd {
    resourceId: string;
    componentId: string | null;
    informationFieldIds: string[];
    informationObjectIds: string[];
}

// Where a script reads from or writes to, before it has any information
export type ComponentEndTarget = Pick<ComponentEnd, 'resourceId' | 'componentId'>;

// Where information sits in a component: a script takes it in (input) and produces it (output), a file contains it
export type InformationSlot = 'input' | 'output' | 'contains';

export function getInformationSlotIds(component: Component, slot: InformationSlot) {
    if (slot === 'input') {
        return { informationFieldIds: component.inputInformationFieldIds, informationObjectIds: component.inputInformationObjectIds };
    }
    if (slot === 'output') {
        return { informationFieldIds: component.outputInformationFieldIds, informationObjectIds: component.outputInformationObjectIds };
    }
    return { informationFieldIds: component.informationFieldIds, informationObjectIds: component.informationObjectIds };
}

// The information a script reads from or writes to the ends that match
export function getEndsInformation(ends: ComponentEnd[], matches: (end: ComponentEnd) => boolean) {
    const matching = ends.filter(matches);
    return {
        informationFieldIds: [...new Set(matching.flatMap(end => end.informationFieldIds))],
        informationObjectIds: [...new Set(matching.flatMap(end => end.informationObjectIds))]
    };
}

// What a script carries from the sources to the targets. A script reads into its host and writes from its host:
// - hosted on a target: what it reads from a source
// - hosted on a source: what it writes to a target
// - otherwise: what it reads from a source and also writes to a target
export function getScriptCarriedBetween(script: Component, sourceIds: string[], targetIds: string[]) {
    const read = getEndsInformation(script.inputs, end => sourceIds.includes(end.resourceId));
    const written = getEndsInformation(script.outputs, end => targetIds.includes(end.resourceId));
    if (targetIds.includes(script.resourceId)) return read;
    if (sourceIds.includes(script.resourceId)) return written;
    return {
        informationFieldIds: read.informationFieldIds.filter(id => written.informationFieldIds.includes(id)),
        informationObjectIds: read.informationObjectIds.filter(id => written.informationObjectIds.includes(id))
    };
}

// Whether the script connects a source to a target: it reads from a source into its host on a target, writes from
// its host on a source to a target, or reads from a source and writes to a target
export function connectsScript(script: Component, sourceIds: string[], targetIds: string[]) {
    if (script.kind !== 'script') return false;
    const readsSource = script.inputs.some(end => sourceIds.includes(end.resourceId));
    const writesTarget = script.outputs.some(end => targetIds.includes(end.resourceId));
    return (readsSource && (writesTarget || targetIds.includes(script.resourceId))) ||
        (writesTarget && sourceIds.includes(script.resourceId));
}

// A component as a row inside the node of its resource on the canvas. Edges attach to the row through its handles
export interface CanvasComponentRow {
    id: string;
    // The view node of the component: selecting it opens the details of the component
    viewNodeId?: string;
    kind: ComponentKind;
    name: string;
    icon: string;
    // Whether the component uses the searched information; undefined when nothing is searched
    searchMatch?: boolean;
    // Script: the information it takes in and produces, shown like the inputs and outputs of an application
    inputs?: CanvasComponentInformation;
    outputs?: CanvasComponentInformation;

    // File: the scripts that write to it and read from it, and the information it contains
    incoming: CanvasComponentLink[];
    outgoing: CanvasComponentLink[];
    objectNames: string[];
    fieldNames: string[];
}

export interface CanvasComponentInformation {
    objects: { id: string, name: string, fieldNames: string[] }[];
    fieldNames: string[];
}

export interface CanvasComponentLink {
    key: string;
    name: string;
    icon: string;
}

// The ids of the handles of a component row; an edge to or from a component attaches to these
export function getComponentHandleId(componentId: string, side: 'in' | 'out') {
    return `component-${side}-${componentId}`;
}

export interface Component {
    id: string;
    kind: ComponentKind;
    name: string;
    description: string;

    // The resource the component is part of: the host of a script, the file location of a file
    resourceId: string;
    resourceType: 'application' | 'fileLocation';

    // Script: what it reads from and writes to
    inputs: ComponentEnd[];
    outputs: ComponentEnd[];

    // Script: the information it takes in from what it reads, and the information it produces for what it writes.
    // What it produces is what it carries to the resources it writes to
    inputInformationFieldIds: string[];
    inputInformationObjectIds: string[];
    outputInformationFieldIds: string[];
    outputInformationObjectIds: string[];

    // File: the information the file contains
    informationFieldIds: string[];
    informationObjectIds: string[];

    // File: what kind of file it is
    fileType: FileType;
}
