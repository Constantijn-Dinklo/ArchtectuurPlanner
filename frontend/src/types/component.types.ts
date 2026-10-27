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

    // Script: the information it carries from its inputs to its outputs.
    // File: the information the file contains
    informationFieldIds: string[];
    informationObjectIds: string[];

    // File: what kind of file it is
    fileType: FileType;
}
