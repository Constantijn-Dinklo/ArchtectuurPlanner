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
// or a component inside a resource, like a file in a file location
export interface ComponentEnd {
    resourceId: string;
    componentId: string | null;
}

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

// What a script carries to the resources it writes to: the information it produces
export function getScriptCarriedInformation(script: Component) {
    return getInformationSlotIds(script, 'output');
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
