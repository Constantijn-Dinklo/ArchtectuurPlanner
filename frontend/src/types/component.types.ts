// Levels of the architecture: a host (server) holds resources, a resource holds components.
// A component is a part of a resource: a script that runs in an application or file location,
// a file in a file location, or a table in a database. Components never contain other components.
export type ComponentKind = 'script' | 'file' | 'table';

// How a kind of component is drawn on the canvas, set per kind below so it can change later:
// - 'row': a row inside the node of its resource, with handles of its own, so edges go to the row
// - 'table': a table card laid out inside its database. It has no edges of its own: they go to the database
export type ComponentDisplay = 'row' | 'table';

export const COMPONENT_DISPLAYS: Record<ComponentKind, ComponentDisplay> = {
    script: 'row',
    file: 'row',
    table: 'table'
};

export function getComponentDisplay(component: Pick<Component, 'kind'>) {
    return COMPONENT_DISPLAYS[component.kind];
}

// A table and a file are reached through the resource they are part of: a connection goes to their database or file
// location, and a relation through it can end at the table or file. A script is a connection end of its own.
// The same as the backend (KINDS_CONNECTED_THROUGH_RESOURCE in component.model.ts)
export const KINDS_CONNECTED_THROUGH_RESOURCE: ComponentKind[] = ['table', 'file'];

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
    if (component.kind === 'script') return 'pi pi-code';
    if (component.kind === 'table') return 'pi pi-table';
    return getFileTypeInfo(component.fileType).icon;
}

// Where information sits in a component: a script takes it in (input) and produces it (output), a file or table
// contains it (a table only fields: its columns)
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

    // Script: what it reads from and writes to. File: what writes to it and what reads from it
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

    // The resource the component is part of: the host of a script, the file location of a file, the database of a table
    resourceId: string;
    resourceType: 'application' | 'fileLocation' | 'database';

    // Script: the information it takes in and produces, like the inputs and outputs of an application. What it reads
    // from and writes to are connections, with relations for the information that goes over them
    inputInformationFieldIds: string[];
    inputInformationObjectIds: string[];
    outputInformationFieldIds: string[];
    outputInformationObjectIds: string[];

    // File: the information the file contains. Table: its columns, only fields
    informationFieldIds: string[];
    informationObjectIds: string[];

    // File: what kind of file it is
    fileType: FileType;
}
