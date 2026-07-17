export type ResourceType = 'application' | 'database' | 'fileLocation' | 'server' | 'table';

export interface BaseResource {
    id: string;
    name: string;
    type: ResourceType
}