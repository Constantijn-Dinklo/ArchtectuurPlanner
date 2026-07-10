export type ResourceType = 'application' | 'database' | 'fileLocation' | 'server';

export interface BaseResource {
    id: string;
    name: string;
    type: ResourceType
}