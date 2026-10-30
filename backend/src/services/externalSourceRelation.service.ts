import { NextFunction, Response } from "express";

import { AuthenticatedRequest, getUser } from "../middelware";
import External from "../models/resources/external.model";
import Application from "../models/resources/application.model";
import Table from "../models/resources/table.model";
import InformationObject from "../models/information/informationObject.models";
import OtherConnection from "../models/otherConnection.model";
import ApiConnection from "../models/apiConnection.model";
import Api from "../models/api.model";
import Script from "../models/script.model";
import Component from "../models/component.model";
import ResourceFieldRelation from "../models/information/resourceFieldRelation.model";
import ResourceObjectRelation from "../models/information/resourceObjectRelation.model";
import { updateReceivedInformation } from "./externalRelation.service";

// External elements are black boxes: nobody adds their relations by hand. The relations that involve them are kept
// in sync here, so every movement of information to or from an external element is stored as a relation.
//
// From an external element: what it provides reaches the resources it is connected to (other connection, api
// connection, script, script component). Each piece of information it provides that the resource takes in gets a
// relation external element -> resource, via that connection.
// - an application takes in its input fields and input objects
// - a table takes in its columns, also when the external element provides the field inside an object;
//   a connection to a database reaches all of its tables
//
// To an external element through an api connection: everything the api carries gets a relation from the owner of
// the api (an application or an external element) to the external element, via that api connection.
// (Relations to an external element through an other connection are kept by syncOtherConnectionRelations.)
//
// A relation from an external element that was added by hand is left alone, and no second relation is added next to it.

type ManagedVia = 'other' | 'api' | 'script' | 'component';
const MANAGED_VIA_TYPES: ManagedVia[] = ['other', 'api', 'script', 'component'];

interface DesiredRelation {
    kind: 'field' | 'object';
    informationId: string;
    sourceId: string;
    sourceType: 'application' | 'external';
    targetId: string;
    targetType: 'application' | 'table' | 'external';
    viaType: ManagedVia;
    viaId: string;
}

type RelationEnds = Pick<DesiredRelation, 'kind' | 'informationId' | 'sourceId' | 'targetId'>;

function relationKey(relation: RelationEnds) {
    return `${relation.kind}|${relation.informationId}|${relation.sourceId}|${relation.targetId}`;
}

function managedKey(relation: RelationEnds & { viaType: string, viaId: string }) {
    return `${relationKey(relation)}|${relation.viaType}|${relation.viaId}`;
}

export async function syncExternalSourceRelations(user: { environmentId: string }) {
    const environmentId = user.environmentId;
    const externals = await External.find({ environmentId });
    const externalIds = externals.map((external) => external._id.toString());
    if(!externalIds.length) return;

    const desired = [
        ...await getRelationsFromExternals(environmentId, externals),
        ...await getApiRelationsToExternals(environmentId, externalIds)
    ];

    // The relations this sync looks after: from an external element to an internal resource,
    // and to an external element through an api connection
    const managedScope = {
        environmentId,
        $or: [
            { sourceResourceId: { $in: externalIds }, targetResourceType: { $ne: 'external' } },
            { targetResourceType: 'external', viaConnectionType: 'api' as const }
        ]
    };
    const existingFieldRelations = await ResourceFieldRelation.find(managedScope);
    const existingObjectRelations = await ResourceObjectRelation.find(managedScope);
    const existing = [
        ...existingFieldRelations.map((relation) => ({ relation, kind: 'field' as const, informationId: relation.informationFieldId.toString() })),
        ...existingObjectRelations.map((relation) => ({ relation, kind: 'object' as const, informationId: relation.informationObjectId.toString() }))
    ].map(({ relation, kind, informationId }) => {
        const ends = { kind, informationId, sourceId: relation.sourceResourceId.toString(), targetId: relation.targetResourceId.toString() };
        const isManaged = MANAGED_VIA_TYPES.includes(relation.viaConnectionType as ManagedVia) && !!relation.viaConnectionId;
        return {
            id: relation._id.toString(),
            kind,
            targetId: ends.targetId,
            key: relationKey(ends),
            managedKey: isManaged
                ? managedKey({ ...ends, viaType: relation.viaConnectionType!, viaId: relation.viaConnectionId!.toString() })
                : undefined
        };
    });

    // Relations through a connection that no longer brings the information there
    const desiredKeys = new Set(desired.map(managedKey));
    const stale = existing.filter((relation) => relation.managedKey && !desiredKeys.has(relation.managedKey));
    const staleFieldIds = stale.filter((relation) => relation.kind === 'field').map((relation) => relation.id);
    const staleObjectIds = stale.filter((relation) => relation.kind === 'object').map((relation) => relation.id);
    if(staleFieldIds.length) await ResourceFieldRelation.deleteMany({ _id: { $in: staleFieldIds } });
    if(staleObjectIds.length) await ResourceObjectRelation.deleteMany({ _id: { $in: staleObjectIds } });

    // New relations, unless there already is a relation between the two for this information
    const staleIds = new Set(stale.map((relation) => relation.id));
    const present = new Set(existing.filter((relation) => !staleIds.has(relation.id)).map((relation) => relation.key));
    const changedExternalIds = new Set(stale.map((relation) => relation.targetId).filter((id) => externalIds.includes(id)));
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
            viaConnectionType: relation.viaType,
            viaConnectionId: relation.viaId
        };
        if(relation.kind === 'field') {
            await ResourceFieldRelation.create({ ...fields, informationFieldId: relation.informationId });
        }
        else {
            await ResourceObjectRelation.create({ ...fields, informationObjectId: relation.informationId });
        }
        if(relation.targetType === 'external') changedExternalIds.add(relation.targetId);
    }

    // The received lists of external elements follow the relations to them
    for(const externalId of changedExternalIds) {
        await updateReceivedInformation(user, externalId);
    }
}

type ExternalDocuments = Awaited<ReturnType<typeof External.find>>;

async function getRelationsFromExternals(environmentId: string, externals: ExternalDocuments): Promise<DesiredRelation[]> {
    const externalIds = externals.map((external) => external._id.toString());

    // The connections from an external element: [external element, connected resource, via]
    const links: { externalId: string, targetId: string, viaType: ManagedVia, viaId: string }[] = [];

    const otherConnections = await OtherConnection.find({ environmentId, sourceId: { $in: externalIds } });
    for(const connection of otherConnections) {
        if(connection.targetId) {
            links.push({ externalId: connection.sourceId!.toString(), targetId: connection.targetId.toString(), viaType: 'other', viaId: connection._id.toString() });
        }
    }

    const apiConnections = await ApiConnection.find({ environmentId, sourceId: { $in: externalIds } });
    for(const connection of apiConnections) {
        if(connection.targetId) {
            links.push({ externalId: connection.sourceId!.toString(), targetId: connection.targetId.toString(), viaType: 'api', viaId: connection._id.toString() });
        }
    }

    const scripts = await Script.find({ environmentId, inputIds: { $in: externalIds } });
    for(const script of scripts) {
        const readExternalIds = script.inputIds.map((id) => id.toString()).filter((id) => externalIds.includes(id));
        for(const externalId of readExternalIds) {
            for(const outputId of script.outputIds) {
                links.push({ externalId, targetId: outputId.toString(), viaType: 'script', viaId: script._id.toString() });
            }
        }
    }

    const scriptComponents = await Component.find({ environmentId, kind: 'script', 'inputs.resourceId': { $in: externalIds } });
    for(const component of scriptComponents) {
        const readExternalIds = component.inputs.map((end) => end.resourceId.toString()).filter((id) => externalIds.includes(id));
        for(const externalId of readExternalIds) {
            for(const end of component.outputs) {
                links.push({ externalId, targetId: end.resourceId.toString(), viaType: 'component', viaId: component._id.toString() });
            }
        }
    }

    // What the connected resources take in
    const targetIds = [...new Set(links.map((link) => link.targetId))];
    const applications = await Application.find({ environmentId, _id: { $in: targetIds } });
    const tables = await Table.find({ environmentId, $or: [{ _id: { $in: targetIds } }, { databaseId: { $in: targetIds } }] });

    const providedObjectIds = externals.flatMap((external) => external.providedInformationObjects.map((ref) => ref.informationObjectId));
    const providedObjects = await InformationObject.find({ environmentId, _id: { $in: providedObjectIds } });
    const objectFieldIds = new Map(providedObjects.map((object) => [object._id.toString(), object.informationFieldIds.map((id) => id.toString())]));

    const desired: DesiredRelation[] = [];
    for(const link of links) {
        const external = externals.find((external) => external._id.toString() === link.externalId)!;
        const providedFieldIds = external.providedInformationFields.map((ref) => ref.informationFieldId.toString());
        const providedObjectIdsOfExternal = external.providedInformationObjects.map((ref) => ref.informationObjectId.toString());
        const via = { sourceId: link.externalId, sourceType: 'external' as const, viaType: link.viaType, viaId: link.viaId };

        const application = applications.find((application) => application._id.toString() === link.targetId);
        if(application) {
            for(const ref of application.inputInformationFields) {
                const informationId = ref.informationFieldId.toString();
                if(providedFieldIds.includes(informationId)) {
                    desired.push({ ...via, kind: 'field', informationId, targetId: link.targetId, targetType: 'application' });
                }
            }
            for(const ref of application.inputInformationObjects) {
                const informationId = ref.informationObjectId.toString();
                if(providedObjectIdsOfExternal.includes(informationId)) {
                    desired.push({ ...via, kind: 'object', informationId, targetId: link.targetId, targetType: 'application' });
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
            table._id.toString() === link.targetId || table.databaseId?.toString() === link.targetId
        );
        for(const table of connectedTables) {
            for(const column of table.columns) {
                const informationId = column.informationFieldId.toString();
                if(fieldIdsInReach.has(informationId)) {
                    desired.push({ ...via, kind: 'field', informationId, targetId: table._id.toString(), targetType: 'table' });
                }
            }
        }
    }
    return desired;
}

// An api connection to an external element carries everything its api carries
async function getApiRelationsToExternals(environmentId: string, externalIds: string[]): Promise<DesiredRelation[]> {
    const apiConnections = await ApiConnection.find({ environmentId, targetId: { $in: externalIds }, sourceUrlId: { $ne: null } });
    const apis = await Api.find({ environmentId, _id: { $in: apiConnections.map((connection) => connection.sourceUrlId) } });

    const desired: DesiredRelation[] = [];
    for(const connection of apiConnections) {
        const api = apis.find((api) => api._id.toString() === connection.sourceUrlId!.toString());
        const sourceId = (connection.sourceId ?? api?.applicationId)?.toString();
        if(!api || !sourceId) continue;

        const ends = {
            sourceId,
            sourceType: externalIds.includes(sourceId) ? 'external' as const : 'application' as const,
            targetId: connection.targetId!.toString(),
            targetType: 'external' as const,
            viaType: 'api' as const,
            viaId: connection._id.toString()
        };
        api.informationFieldIds.forEach((id) => desired.push({ ...ends, kind: 'field', informationId: id.toString() }));
        api.informationObjectIds.forEach((id) => desired.push({ ...ends, kind: 'object', informationId: id.toString() }));
    }
    return desired;
}

// For the routes that change what external elements provide, what resources take in or carry, or how they are
// connected: after a successful change the relations of external elements are brought up to date, before the
// response is sent
export function keepExternalSourceRelationsInSync(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if(req.method === 'GET') return next();

    const json = res.json.bind(res);
    res.json = ((body: any) => {
        if(res.statusCode >= 400) return json(body);

        syncExternalSourceRelations(getUser(req))
            .catch((err) => console.error('Syncing the relations of external elements failed:', err.message))
            .finally(() => json(body));
        return res;
    }) as Response['json'];

    next();
}
