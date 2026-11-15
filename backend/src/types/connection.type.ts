// A connection is a directed link from one part of the landscape to another: how things can get from the source to
// the target. These types are what the rest of the backend works with, so they do not depend on how connections are stored.

// What a connection end can be: a resource, or a component inside one. Levels above a resource (a server) are never
// an end: they follow from the parents
export const PART_TYPES = ['application', 'database', 'fileLocation', 'external', 'table', 'script', 'file'] as const;
export type PartType = typeof PART_TYPES[number];

export interface PartRef {
    id: string;
    type: PartType;
}

// How it gets there. 'unknown' says something gets there but nobody knows how yet
export const CONNECTION_KINDS = ['api', 'database', 'file', 'manual', 'email', 'feature', 'unknown'] as const;
export type ConnectionKind = typeof CONNECTION_KINDS[number];

interface ConnectionBase {
    id: string;
    source: PartRef;
    target: PartRef;
    description: string;
}

// Only the fields a kind needs. An api connection goes through one api of its source
export type ApiConnection = ConnectionBase & { kind: 'api', apiId: string };
export type PlainConnection = ConnectionBase & { kind: Exclude<ConnectionKind, 'api'> };
export type Connection = ApiConnection | PlainConnection;

// What is needed to make a connection, or to change one
export type ConnectionInput =
    | { kind: 'api', source: PartRef, target: PartRef, description?: string, apiId: string }
    | { kind: Exclude<ConnectionKind, 'api'>, source: PartRef, target: PartRef, description?: string };
