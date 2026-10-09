import { UserJwtPayload } from "../middelware";
import External from "../models/resources/external.model";
import Application from "../models/resources/application.model";
import Database from "../models/resources/database.model";
import Table from "../models/resources/table.model";
import FileLocation from "../models/resources/fileLocation.model";
import Server from "../models/resources/server.model";
import OtherConnection from "../models/otherConnection.model";
import ResourceFieldRelation from "../models/information/resourceFieldRelation.model";
import ResourceObjectRelation from "../models/information/resourceObjectRelation.model";

// An external element is a black box without its own inputs. What it receives is decided by the connections
// to it: every field or object a connection carries to an external element gets a relation from the source
// to the external element, and the external element's received lists follow those relations.

export async function getResourceType(user: UserJwtPayload, resourceId: string): Promise<string | undefined> {
    const filter = { _id: resourceId, organisationId: user.organisationId };
    const models = [
        ['application', Application],
        ['database', Database],
        ['table', Table],
        ['fileLocation', FileLocation],
        ['server', Server],
        ['external', External]
    ] as const;

    for(const [type, model] of models) {
        if(await (model as any).exists(filter)) return type;
    }
    return undefined;
}

// Rebuilds the received lists of the external element from the relations that point to it
async function updateReceivedInformation(user: UserJwtPayload, externalId: string) {
    const fieldIds = await ResourceFieldRelation.distinct('informationFieldId', {
        organisationId: user.organisationId,
        targetResourceId: externalId
    });
    const objectIds = await ResourceObjectRelation.distinct('informationObjectId', {
        organisationId: user.organisationId,
        targetResourceId: externalId
    });

    await External.updateOne(
        { _id: externalId, organisationId: user.organisationId },
        {
            $set: {
                receivedInformationFields: fieldIds.map((informationFieldId) => ({ informationFieldId, position: 1 })),
                receivedInformationObjects: objectIds.map((informationObjectId) => ({ informationObjectId, position: 1 }))
            }
        }
    );
}

// Makes the relations of an other connection match what it carries to an external element.
// previousTargetId: the target before the connection was changed, so that external element is updated as well
export async function syncOtherConnectionRelations(user: UserJwtPayload, connectionId: string, previousTargetId?: string | null) {
    const connection = await OtherConnection.findOne({ _id: connectionId, organisationId: user.organisationId });

    const viaThisConnection = {
        organisationId: user.organisationId,
        viaConnectionType: 'other' as const,
        viaConnectionId: connectionId
    };

    const targetId = connection?.targetId?.toString();
    const sourceId = connection?.sourceId?.toString();
    const targetIsExternal = !!targetId && (await getResourceType(user, targetId)) === 'external';
    const sourceType = sourceId ? await getResourceType(user, sourceId) : undefined;

    if(!connection || !targetIsExternal || !sourceId || !sourceType) {
        // Nothing (or no longer anything) is carried to an external element through this connection
        await ResourceFieldRelation.deleteMany(viaThisConnection);
        await ResourceObjectRelation.deleteMany(viaThisConnection);
        if(targetId && targetIsExternal) {
            await updateReceivedInformation(user, targetId);
        }
    }
    else {
        const fieldIds = connection.informationFieldIds.map((id) => id.toString());
        const objectIds = connection.informationObjectIds.map((id) => id.toString());

        // Relations of information that is no longer carried, or that belonged to a different source or target
        await ResourceFieldRelation.deleteMany({
            ...viaThisConnection,
            $or: [
                { informationFieldId: { $nin: fieldIds } },
                { sourceResourceId: { $ne: sourceId } },
                { targetResourceId: { $ne: targetId } }
            ]
        });
        await ResourceObjectRelation.deleteMany({
            ...viaThisConnection,
            $or: [
                { informationObjectId: { $nin: objectIds } },
                { sourceResourceId: { $ne: sourceId } },
                { targetResourceId: { $ne: targetId } }
            ]
        });

        const relation = {
            organisationId: user.organisationId,
            sourceResourceId: sourceId,
            sourceResourceType: sourceType,
            targetResourceId: targetId,
            targetResourceType: 'external',
            viaConnectionType: 'other' as const,
            viaConnectionId: connectionId
        };
        for(const informationFieldId of fieldIds) {
            await ResourceFieldRelation.updateOne(
                { ...viaThisConnection, informationFieldId },
                { $setOnInsert: { ...relation, informationFieldId } },
                { upsert: true }
            );
        }
        for(const informationObjectId of objectIds) {
            await ResourceObjectRelation.updateOne(
                { ...viaThisConnection, informationObjectId },
                { $setOnInsert: { ...relation, informationObjectId } },
                { upsert: true }
            );
        }

        await updateReceivedInformation(user, targetId);
    }

    if(previousTargetId && previousTargetId !== targetId && (await getResourceType(user, previousTargetId)) === 'external') {
        await updateReceivedInformation(user, previousTargetId);
    }
}
