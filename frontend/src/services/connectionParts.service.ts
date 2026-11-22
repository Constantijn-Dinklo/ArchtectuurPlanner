import { useComponentStore } from "../stores/resources/component.store";
import { useTableStore } from "../stores/resources/table.store";
import { useResourceService } from "./resources/resource.service";
import { useTableService } from "./resources/table.service";
import { useInformationSourceService, type MethodOption } from "./informationSource.service";
import type { FileType } from "../types/component.types";
import type { ConnectionEnd, ConnectionEndTarget } from "../types/connectionEnd.types";

// A part that can be picked for a connected resource: a table, a file, an api or a way information goes
export interface PartOption {
    key: string;
    target: ConnectionEndTarget;
    label: string;
    // Already one of the parts
    disabled: boolean;
}

// One dropdown to pick a part with. A resource can have several side by side (an api, or another way)
export interface PartPicker {
    placeholder: string;
    options: PartOption[];
    emptyMessage: string;
    // Shows a search field
    filterPlaceholder?: string;
}

// Makes a new part with a name, e.g. a new table in the database
export interface PartCreator {
    placeholder: string;
    title: string;
    withFileType: boolean;
    create: (name: string, fileType: FileType) => Promise<ConnectionEndTarget | undefined>;
}

// What the parts of a connected resource are: what it reads from or writes to inside that resource, or how it gets there
export interface PartSpec {
    // Shown while there is no part yet
    emptyText: string;
    removeTitle: string;
    pickers: PartPicker[];
    creator?: PartCreator;
}

// The parts a resource can have, so a section only has to say which kind it wants. The ends are the parts there are
export function useConnectionParts() {
    const componentStore = useComponentStore();
    const tableStore = useTableStore();
    const tableService = useTableService();
    const resourceService = useResourceService();
    const informationSourceService = useInformationSourceService();

    function isUsed(ends: ConnectionEnd[], target: ConnectionEndTarget) {
        return ends.some(end =>
            end.resourceId === target.resourceId &&
            (end.componentId ?? null) === (target.componentId ?? null) &&
            (end.apiId ?? null) === (target.apiId ?? null)
        );
    }

    function toOptions(ends: ConnectionEnd[], targets: { target: ConnectionEndTarget, label: string }[]): PartOption[] {
        return targets
            .map(({ target, label }) => ({
                key: `${target.resourceId}:${target.componentId ?? ''}:${target.apiId ?? ''}`,
                target,
                label,
                disabled: isUsed(ends, target)
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }

    // The tables of a database
    function tables(databaseId: string, ends: ConnectionEnd[]): PartSpec {
        return {
            emptyText: 'No table chosen yet',
            removeTitle: 'Remove this table',
            pickers: [{
                placeholder: '+ Choose a table…',
                options: toOptions(ends, tableStore.getTables(databaseId).map(table => ({ target: { resourceId: table.id, componentId: null }, label: table.name }))),
                emptyMessage: 'No tables yet',
                filterPlaceholder: 'Search table'
            }],
            creator: {
                placeholder: '+ New table',
                title: 'Add table',
                withFileType: false,
                create: async (name) => {
                    const tableId = await tableService.createTable(name, databaseId);
                    return tableId ? { resourceId: tableId, componentId: null } : undefined;
                }
            }
        };
    }

    // The files of a file location
    function files(fileLocationId: string, ends: ConnectionEnd[]): PartSpec {
        const locationFiles = componentStore.getResourceComponents(fileLocationId).filter(component => component.kind === 'file');
        return {
            emptyText: 'No file chosen yet',
            removeTitle: 'Remove this file',
            pickers: [{
                placeholder: '+ Choose a file…',
                options: toOptions(ends, locationFiles.map(file => ({ target: { resourceId: fileLocationId, componentId: file.id }, label: file.name }))),
                emptyMessage: 'No files yet',
                filterPlaceholder: 'Search file'
            }],
            creator: {
                placeholder: '+ New file',
                title: 'Add file',
                withFileType: true,
                create: async (name, fileType) => {
                    const file = await componentStore.createComponent(fileLocationId, 'file', name, fileType);
                    return file ? { resourceId: fileLocationId, componentId: file.id } : undefined;
                }
            }
        };
    }

    // The ways information goes to or from another resource, each a connection of its own: an api of the sender (the
    // most common way, so it has its own dropdown), or another way. An api is one way, so it is used once; another kind
    // can be used more often (two ways by hand)
    function connectionTypes(resourceId: string, senderId: string, ends: ConnectionEnd[]): PartSpec {
        const toTargets = (options: MethodOption[]) => options.map(option => ({
            key: option.key,
            target: { resourceId, componentId: null, connectionKind: option.kind, apiId: option.apiId },
            label: option.label
        }));
        const isOwnApi = senderId === resourceId;
        return {
            emptyText: 'No connection types yet',
            removeTitle: 'Remove this connection, with what goes through it',
            pickers: [
                {
                    placeholder: '+ API…',
                    options: toTargets(informationSourceService.getApiMethodOptions(senderId))
                        .map(option => ({ ...option, disabled: ends.some(end => end.apiId === option.target.apiId) })),
                    emptyMessage: isOwnApi ? 'This has no APIs yet' : 'The sender has no APIs yet',
                    filterPlaceholder: 'Search API'
                },
                {
                    placeholder: '+ Other way…',
                    options: toTargets(informationSourceService.getOtherMethodOptions()).map(option => ({ ...option, disabled: false })),
                    emptyMessage: 'No other ways'
                }
            ]
        };
    }

    // The parts of a resource of any type: a database has tables, a file location files, and an application, external
    // element or script what the section chooses (the ways information goes)
    function forResource(resourceId: string, ends: ConnectionEnd[], applicationParts: () => PartSpec): PartSpec {
        const type = resourceService.getResource(resourceId)?.type;
        if (type === 'database') return tables(resourceId, ends);
        if (type === 'fileLocation') return files(resourceId, ends);
        return applicationParts();
    }

    return { tables, files, connectionTypes, forResource };
}
