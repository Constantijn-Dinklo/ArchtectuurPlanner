// A connection is a directed link from one part of the landscape to another: how things can get from the source to
// the target. Every relation (a field or object moving from one part to another) goes through one connection.
// The same types as the backend (backend/src/types/connection.type.ts)

// What a connection end can be: a resource, or a component inside one
export type PartType = 'application' | 'database' | 'fileLocation' | 'external' | 'table' | 'script' | 'file';

export interface PartRef {
    id: string;
    type: PartType;
}

// How it gets there. 'unknown' says something gets there but nobody knows how yet
export type ConnectionKind = 'api' | 'database' | 'file' | 'manual' | 'email' | 'feature' | 'unknown';

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

// What is needed to make a connection
export type ConnectionInput =
    | { kind: 'api', source: PartRef, target: PartRef, description?: string, apiId: string }
    | { kind: Exclude<ConnectionKind, 'api'>, source: PartRef, target: PartRef, description?: string };

// What can change: how it gets there and the description. The ends stay the same
export type ConnectionPatch =
    | { kind: 'api', apiId: string, description?: string }
    | { kind?: Exclude<ConnectionKind, 'api'>, description?: string };

export const CONNECTION_KINDS: { kind: ConnectionKind, label: string, icon: string }[] = [
    { kind: 'api', label: 'API', icon: 'pi pi-globe' },
    { kind: 'database', label: 'Database', icon: 'pi pi-database' },
    { kind: 'file', label: 'File', icon: 'pi pi-file' },
    { kind: 'manual', label: 'By hand', icon: 'pi pi-user' },
    { kind: 'email', label: 'E-mail', icon: 'pi pi-envelope' },
    { kind: 'feature', label: 'Send function', icon: 'pi pi-send' },
    { kind: 'unknown', label: 'Unknown', icon: 'pi pi-question-circle' }
];

export function getConnectionKindInfo(kind: ConnectionKind) {
    return CONNECTION_KINDS.find(option => option.kind === kind) ?? CONNECTION_KINDS[CONNECTION_KINDS.length - 1]!;
}
