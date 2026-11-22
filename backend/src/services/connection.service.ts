import { UserJwtPayload } from "../middelware";
import Api from "../models/api.model";
import Component, { KINDS_CONNECTED_THROUGH_RESOURCE } from "../models/component.model";
import Connection, { CONNECTION_MODELS, IConnection } from "../models/connection.model";
import ResourceFieldRelation from "../models/information/resourceFieldRelation.model";
import ResourceObjectRelation from "../models/information/resourceObjectRelation.model";
import { getResourceType } from "./externalRelation.service";
import {
    CONNECTION_KINDS,
    Connection as ConnectionType,
    ConnectionInput,
    ConnectionKind,
    PART_TYPES,
    PartRef,
    PartType
} from "../types/connection.type";

// The only place that reads and writes connections. Everything else uses these functions and the types in
// connection.type.ts, so how connections are stored can change without the rest of the backend noticing.
//
// The ends of a connection have to exist with the type they say they have, and fit the kind:
// - an api connection goes through an api of its source (an application or external element)
// - a database connection has a database (or a table of one) on one end
// The ends of a connection never change: a connection to somewhere else is a new connection

type User = Pick<UserJwtPayload, 'environmentId'>;

function toConnection(document: IConnection): ConnectionType {
    const base = {
        id: document._id.toString(),
        source: { id: document.source.id.toString(), type: document.source.type },
        target: { id: document.target.id.toString(), type: document.target.type },
        description: document.description ?? ''
    };
    if(document.kind === 'api') return { ...base, kind: 'api', apiId: (document as any).apiId.toString() };
    return { ...base, kind: document.kind };
}

// <-- Reading -->

export async function getConnections(user: User) {
    const documents = await Connection.find({ environmentId: user.environmentId });
    return documents.map(toConnection);
}

export async function getConnection(user: User, connectionId: string) {
    const document = await Connection.findOne({ _id: connectionId, environmentId: user.environmentId });
    return document ? toConnection(document) : undefined;
}

// The connections from source to target, or in both directions
export async function getConnectionsBetween(user: User, sourceId: string, targetId: string, bothDirections = false) {
    const ends = [{ 'source.id': sourceId, 'target.id': targetId }];
    if(bothDirections) ends.push({ 'source.id': targetId, 'target.id': sourceId });
    const documents = await Connection.find({ environmentId: user.environmentId, $or: ends });
    return documents.map(toConnection);
}

// The connections of a part, in either direction
export async function getPartConnections(user: User, partId: string) {
    const documents = await Connection.find({
        environmentId: user.environmentId,
        $or: [{ 'source.id': partId }, { 'target.id': partId }]
    });
    return documents.map(toConnection);
}

// A part and the part it is inside of: a table is inside its database, a file inside its file location. A connection
// end holds a relation end when it is one of these
export async function getHolderIds(user: User, partId: string) {
    const component = await Component.findOne({ _id: partId, environmentId: user.environmentId, kind: { $in: KINDS_CONNECTED_THROUGH_RESOURCE } });
    return component ? [partId, component.resourceId.toString()] : [partId];
}

// The connections that can carry information from the source to the target: their ends are those parts, or hold them
export async function getCarryingConnections(user: User, sourceId: string, targetId: string) {
    const documents = await Connection.find({
        environmentId: user.environmentId,
        'source.id': { $in: await getHolderIds(user, sourceId) },
        'target.id': { $in: await getHolderIds(user, targetId) }
    });
    return documents.map(toConnection);
}

// <-- Checking -->

// What a part is: a resource, or a script or file inside one
async function getPartType(user: User, partId: string): Promise<PartType | undefined> {
    const resourceType = await getResourceType(user as UserJwtPayload, partId);
    if(resourceType) return PART_TYPES.includes(resourceType as PartType) ? resourceType as PartType : undefined;

    const component = await Component.findOne({ _id: partId, environmentId: user.environmentId });
    return component?.kind;
}

function parsePart(value: any, name: string): PartRef {
    if(typeof value?.id !== 'string' || !PART_TYPES.includes(value?.type)) throw new Error(`The ${name} of the connection is missing`);
    return { id: value.id, type: value.type };
}

function parseKind(value: unknown): ConnectionKind {
    if(!CONNECTION_KINDS.includes(value as ConnectionKind)) throw new Error("Unknown kind of connection");
    return value as ConnectionKind;
}

// What a request asks for, with only the fields its kind has
export function parseConnectionInput(body: any): ConnectionInput {
    const kind = parseKind(body?.kind);
    const source = parsePart(body?.source, 'source');
    const target = parsePart(body?.target, 'target');
    const description = typeof body?.description === 'string' ? body.description : undefined;
    if(kind === 'api') {
        if(typeof body?.apiId !== 'string') throw new Error("Choose the api the connection goes through");
        return { kind, source, target, description, apiId: body.apiId };
    }
    return { kind, source, target, description };
}

async function checkConnection(user: User, input: ConnectionInput) {
    if(input.source.id === input.target.id) throw new Error("A part cannot be connected to itself");

    for(const [end, name] of [[input.source, 'source'], [input.target, 'target']] as const) {
        if(await getPartType(user, end.id) !== end.type) throw new Error(`The ${name} of the connection does not exist`);
    }

    if(input.kind === 'api') {
        const api = await Api.findOne({ _id: input.apiId, environmentId: user.environmentId });
        if(!api || api.applicationId?.toString() !== input.source.id) {
            throw new Error("The api of an api connection belongs to its source");
        }
    }

    if(input.kind === 'database' && ![input.source.type, input.target.type].some((type) => type === 'database' || type === 'table')) {
        throw new Error("A database connection has a database on one of its ends");
    }

    // With a database or file location the way is always known; only between applications, external elements and
    // scripts it can still be open
    const OPEN_TYPES: PartType[] = ['application', 'external', 'script'];
    if(input.kind === 'undecided' && ![input.source.type, input.target.type].every((type) => OPEN_TYPES.includes(type))) {
        throw new Error("Only a connection between applications, external elements or scripts can be left undecided");
    }
}

// <-- Changing -->

export async function createConnection(user: User, input: ConnectionInput) {
    await checkConnection(user, input);
    const document = new CONNECTION_MODELS[input.kind]({
        environmentId: user.environmentId,
        ...input,
        description: input.description ?? ''
    });
    await document.save();
    return toConnection(document);
}

// What can change: how it gets there (the kind, with what that kind needs) and the description. Changing the kind
// keeps the id, so everything that goes through the connection stays with it
export async function updateConnection(user: User, connectionId: string, body: any) {
    const document = await Connection.findOne({ _id: connectionId, environmentId: user.environmentId });
    if(!document) return undefined;
    const existing = toConnection(document);

    const input = parseConnectionInput({
        ...existing,
        kind: body?.kind ?? existing.kind,
        apiId: body?.apiId ?? (existing.kind === 'api' ? existing.apiId : undefined),
        description: body?.description ?? existing.description
    });
    await checkConnection(user, input);

    // Without a way chosen nothing can go through it
    if(input.kind === 'undecided' && existing.kind !== 'undecided') {
        const hasRelations = await ResourceFieldRelation.exists({ environmentId: user.environmentId, connectionId })
            || await ResourceObjectRelation.exists({ environmentId: user.environmentId, connectionId });
        if(hasRelations) throw new Error("Information still goes through this connection: remove it first, or choose another way");
    }

    // The new kind decides which fields the connection has: checked with its own schema, then stored in place
    const replacement = new CONNECTION_MODELS[input.kind]({ _id: document._id, environmentId: document.environmentId, ...input });
    await replacement.validate();
    await Connection.collection.replaceOne(
        { _id: document._id },
        { ...replacement.toObject(), createdAt: document.get('createdAt'), updatedAt: new Date() }
    );
    return getConnection(user, connectionId);
}

// Connects the source to the target in this direction when nothing connects them yet, and returns the connection. A
// table is connected through its database, a file through its file location. The kind is what fits the two: a database connection when a database is
// involved, a file for a file location, otherwise undecided: the two are connected, but how is still to be chosen
export async function connectParts(user: User, sourceId: string, targetId: string) {
    const toEnd = async (partId: string): Promise<PartRef> => {
        const holderIds = await getHolderIds(user, partId);
        const id = holderIds[holderIds.length - 1]!;
        const type = await getPartType(user, id);
        if(!type) throw new Error("Unknown part to connect");
        return { id, type };
    };
    const source = await toEnd(sourceId);
    const target = await toEnd(targetId);

    const [existing] = await getConnectionsBetween(user, source.id, target.id);
    if(existing) return existing;

    const types = [source.type, target.type];
    const kind: Exclude<ConnectionKind, 'api'> = types.includes('database') ? 'database' : types.includes('fileLocation') ? 'file' : 'undecided';
    return createConnection(user, { kind, source, target });
}

// The parts were removed: so are their connections
export async function deletePartConnections(user: User, partIds: string[]) {
    await Connection.deleteMany({
        environmentId: user.environmentId,
        $or: [{ 'source.id': { $in: partIds } }, { 'target.id': { $in: partIds } }]
    });
}

// The connections that go through this api
export async function getApiConnections(user: User, apiId: string) {
    const documents = await Connection.find({ environmentId: user.environmentId, kind: 'api', apiId });
    return documents.map(toConnection);
}

// Use deleteConnectionWithRelations (informationRelation.service): the relations through a connection go with it
export async function deleteConnection(user: User, connectionId: string) {
    const deleted = await Connection.findOneAndDelete({ _id: connectionId, environmentId: user.environmentId });
    return deleted ? toConnection(deleted) : undefined;
}
