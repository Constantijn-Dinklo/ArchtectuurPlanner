import { NextFunction, Response } from "express";

import { AuthenticatedRequest, getUser, UserJwtPayload } from "../middelware";
import External from "../models/resources/external.model";
import Application from "../models/resources/application.model";
import { findTables } from "./table.service";
import InformationObject from "../models/information/informationObject.models";
import Api from "../models/api.model";
import ResourceFieldRelation from "../models/information/resourceFieldRelation.model";
import ResourceObjectRelation from "../models/information/resourceObjectRelation.model";
import { updateReceivedInformation } from "./externalRelation.service";
import { syncScriptRelations } from "./scriptRelation.service";
import { getPartConnections } from "./connection.service";
import { Connection } from "../types/connection.type";

// External elements are black boxes, so what they provide and receive is filled in here as far as the connections
// show it. Relations are only added, never taken away, except when they cannot be right:
// - from an external element: what it provides reaches every resource it is connected to that takes it in. An
//   application takes in its input fields and objects; a table its columns, also when the external element provides
//   the field inside an object; a connection to a database reaches all of its tables
// - to an external element through an api connection: everything the api carries, from the owner of the api
// - a relation from an external element for information it no longer provides is removed
// A relation is only added when there is none yet between the two for that information, however it was made.

type Kind = 'field' | 'object';

interface DesiredRelation {
    kind: Kind;
    informationId: string;
    sourceId: string;
    sourceType: 'application' | 'external';
    targetId: string;
    targetType: 'application' | 'table' | 'external';
    connectionId: string;
}

function relationKey(relation: Pick<DesiredRelation, 'kind' | 'informationId' | 'sourceId' | 'targetId'>) {
    return `${relation.kind}|${relation.informationId}|${relation.sourceId}|${relation.targetId}`;
}

type ExternalDocuments = Awaited<ReturnType<typeof External.find>>;

export async function syncExternalSourceRelations(user: Pick<UserJwtPayload, 'environmentId'>) {
    const environmentId = user.environmentId;
    const externals = await External.find({ environmentId });
    if(!externals.length) return;
    const externalIds = externals.map((external) => external._id.toString());
    const changedExternalIds = new Set<string>();

    await removeWhatIsNotProvided(environmentId, externals);

    const connections = new Map<string, Connection>();
    for(const externalId of externalIds) {
        for(const connection of await getPartConnections(user, externalId)) connections.set(connection.id, connection);
    }
    const desired = [
        ...await getRelationsFromExternals(environmentId, externals, [...connections.values()]),
        ...await getApiRelationsToExternals(environmentId, externalIds, [...connections.values()])
    ];

    const present = await getPresentKeys(environmentId, desired);
    for(const relation of desired) {
        const key = relationKey(relation);
        if(present.has(key)) continue;
        present.add(key);

        const fields = {
            environmentId,
            sourceResourceId: relation.sourceId,
            sourceResourceType: relation.sourceType,
            targetResourceId: relation.targetId,
            targetResourceType: relation.targetType,
            connectionId: relation.connectionId,
            scriptId: null
        };
        if(relation.kind === 'field') await ResourceFieldRelation.create({ ...fields, informationFieldId: relation.informationId });
        else await ResourceObjectRelation.create({ ...fields, informationObjectId: relation.informationId });
        if(relation.targetType === 'external') changedExternalIds.add(relation.targetId);
    }

    // The received lists of external elements follow the relations to them
    for(const externalId of changedExternalIds) {
        await updateReceivedInformation(user, externalId);
    }
}

// An external element can only pass on what it provides: a field directly or inside a provided object
async function removeWhatIsNotProvided(environmentId: string, externals: ExternalDocuments) {
    const providedObjects = await InformationObject.find({
        environmentId,
        _id: { $in: externals.flatMap((external) => external.providedInformationObjects.map((ref) => ref.informationObjectId)) }
    });
    for(const external of externals) {
        const objectIds = external.providedInformationObjects.map((ref) => ref.informationObjectId.toString());
        const fieldIds = [
            ...external.providedInformationFields.map((ref) => ref.informationFieldId.toString()),
            ...providedObjects.filter((object) => objectIds.includes(object._id.toString())).flatMap((object) => object.informationFieldIds.map((id) => id.toString()))
        ];
        const fromExternal = { environmentId, sourceResourceId: external._id };
        await ResourceFieldRelation.deleteMany({ ...fromExternal, informationFieldId: { $nin: fieldIds } });
        await ResourceObjectRelation.deleteMany({ ...fromExternal, informationObjectId: { $nin: objectIds } });
    }
}

// What the external elements provide reaches the resources they are connected to
async function getRelationsFromExternals(environmentId: string, externals: ExternalDocuments, connections: Connection[]): Promise<DesiredRelation[]> {
    const externalIds = externals.map((external) => external._id.toString());
    // A connection of which it is not chosen yet how it goes carries nothing
    const links = connections.filter((connection) =>
        externalIds.includes(connection.source.id) && connection.target.type !== 'external' && connection.kind !== 'undecided'
    );

    const targetIds = [...new Set(links.map((link) => link.target.id))];
    const applications = await Application.find({ environmentId, _id: { $in: targetIds } });
    const tables = await findTables(environmentId, { ids: targetIds, databaseIds: targetIds });

    const providedObjectIds = externals.flatMap((external) => external.providedInformationObjects.map((ref) => ref.informationObjectId));
    const providedObjects = await InformationObject.find({ environmentId, _id: { $in: providedObjectIds } });
    const objectFieldIds = new Map(providedObjects.map((object) => [object._id.toString(), object.informationFieldIds.map((id) => id.toString())]));

    const desired: DesiredRelation[] = [];
    for(const link of links) {
        const external = externals.find((external) => external._id.toString() === link.source.id)!;
        const providedFieldIds = external.providedInformationFields.map((ref) => ref.informationFieldId.toString());
        const providedObjectIdsOfExternal = external.providedInformationObjects.map((ref) => ref.informationObjectId.toString());
        const from = { sourceId: link.source.id, sourceType: 'external' as const, connectionId: link.id };

        const application = applications.find((application) => application._id.toString() === link.target.id);
        if(application) {
            for(const ref of application.inputInformationFields) {
                const informationId = ref.informationFieldId.toString();
                if(providedFieldIds.includes(informationId)) {
                    desired.push({ ...from, kind: 'field', informationId, targetId: link.target.id, targetType: 'application' });
                }
            }
            for(const ref of application.inputInformationObjects) {
                const informationId = ref.informationObjectId.toString();
                if(providedObjectIdsOfExternal.includes(informationId)) {
                    desired.push({ ...from, kind: 'object', informationId, targetId: link.target.id, targetType: 'application' });
                }
            }
            continue;
        }

        // A table, or the tables of a database
        const fieldIdsInReach = new Set([
            ...providedFieldIds,
            ...providedObjectIdsOfExternal.flatMap((objectId) => objectFieldIds.get(objectId) ?? [])
        ]);
        const connectedTables = tables.filter((table) =>
            table._id.toString() === link.target.id || table.resourceId.toString() === link.target.id
        );
        for(const table of connectedTables) {
            for(const column of table.informationFieldIds) {
                const informationId = column.toString();
                if(fieldIdsInReach.has(informationId)) {
                    desired.push({ ...from, kind: 'field', informationId, targetId: table._id.toString(), targetType: 'table' });
                }
            }
        }
    }
    return desired;
}

// An api connection to an external element carries everything its api carries
async function getApiRelationsToExternals(environmentId: string, externalIds: string[], connections: Connection[]): Promise<DesiredRelation[]> {
    const apiConnections = connections.flatMap((connection) =>
        connection.kind === 'api' && externalIds.includes(connection.target.id) ? [connection] : []
    );
    const apis = await Api.find({ environmentId, _id: { $in: apiConnections.map((connection) => connection.apiId) } });

    const desired: DesiredRelation[] = [];
    for(const connection of apiConnections) {
        const api = apis.find((api) => api._id.toString() === connection.apiId);
        if(!api) continue;

        const ends = {
            sourceId: connection.source.id,
            sourceType: externalIds.includes(connection.source.id) ? 'external' as const : 'application' as const,
            targetId: connection.target.id,
            targetType: 'external' as const,
            connectionId: connection.id
        };
        api.informationFieldIds.forEach((id) => desired.push({ ...ends, kind: 'field', informationId: id.toString() }));
        api.informationObjectIds.forEach((id) => desired.push({ ...ends, kind: 'object', informationId: id.toString() }));
    }
    return desired;
}

// Relations between the same resources for the same information, however they were added
async function getPresentKeys(environmentId: string, candidates: DesiredRelation[]) {
    const present = new Set<string>();
    if(!candidates.length) return present;

    const ends = {
        environmentId,
        sourceResourceId: { $in: candidates.map((relation) => relation.sourceId) },
        targetResourceId: { $in: candidates.map((relation) => relation.targetId) }
    };
    for(const relation of await ResourceFieldRelation.find(ends)) {
        present.add(relationKey({ kind: 'field', informationId: relation.informationFieldId.toString(), sourceId: relation.sourceResourceId.toString(), targetId: relation.targetResourceId.toString() }));
    }
    for(const relation of await ResourceObjectRelation.find(ends)) {
        present.add(relationKey({ kind: 'object', informationId: relation.informationObjectId.toString(), sourceId: relation.sourceResourceId.toString(), targetId: relation.targetResourceId.toString() }));
    }
    return present;
}

// For the routes that change what external elements provide, what resources take in or carry, or how they are
// connected: after a successful change the relations of scripts and external elements are brought up to date,
// before the response is sent
export function keepExternalSourceRelationsInSync(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if(req.method === 'GET') return next();

    const json = res.json.bind(res);
    res.json = ((body: any) => {
        if(res.statusCode >= 400) return json(body);

        // What scripts read and write is kept in sync here as well
        syncScriptRelations(getUser(req))
            .then(() => syncExternalSourceRelations(getUser(req)))
            .catch((err) => console.error('Syncing the relations of external elements failed:', err.message))
            .finally(() => json(body));
        return res;
    }) as Response['json'];

    next();
}
