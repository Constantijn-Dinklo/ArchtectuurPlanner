export type ResourceType = 'application' | 'database' | 'fileLocation' | 'server' | 'table' | 'external';

export const RESOURCE_ICONS: Record<ResourceType, string> = {
    application: 'pi pi-desktop',
    database: 'pi pi-database',
    table: 'pi pi-table',
    fileLocation: 'pi pi-folder',
    server: 'pi pi-server',
    external: 'pi pi-globe'
};

export interface BaseResource {
    id: string;
    name: string;
    type: ResourceType
}