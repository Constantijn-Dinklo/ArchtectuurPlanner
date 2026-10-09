export type ResourceType = 'application' | 'database' | 'fileLocation' | 'server' | 'table' | 'external';

export interface BaseResource {
    id: string;
    name: string;
    type: ResourceType
}