import { removeComponentEndReferences, removeResourceComponents } from "./component.service";
import Endpoint from "../models/endpoint.model";
import { deletePartConnections } from "./connection.service";
import { UserJwtPayload } from "../middelware";
import External from "../models/resources/external.model";
import Application from "../models/resources/application.model";
import Database from "../models/resources/database.model";
import Table from "../models/resources/table.model";
import FileLocation from "../models/resources/fileLocation.model";
import Server from "../models/resources/server.model";
import ResourceFieldRelation from "../models/information/resourceFieldRelation.model";
import ResourceObjectRelation from "../models/information/resourceObjectRelation.model";
import InformationField from "../models/information/informationField.model";
import InformationObject from "../models/information/informationObject.models";

// An external element is a black box without its own inputs. What it receives follows from the relations to it:
// its received lists are rebuilt from those relations.

export async function getResourceType(user: UserJwtPayload, resourceId: string): Promise<string | undefined> {
    const filter = { _id: resourceId, environmentId: user.environmentId };
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
export async function updateReceivedInformation(user: Pick<UserJwtPayload, 'environmentId'>, externalId: string) {
    const fieldIds = await ResourceFieldRelation.distinct('informationFieldId', {
        environmentId: user.environmentId,
        targetResourceId: externalId
    });
    const objectIds = await ResourceObjectRelation.distinct('informationObjectId', {
        environmentId: user.environmentId,
        targetResourceId: externalId
    });

    await External.updateOne(
        { _id: externalId, environmentId: user.environmentId },
        {
            $set: {
                receivedInformationFields: fieldIds.map((informationFieldId) => ({ informationFieldId, position: 1 })),
                receivedInformationObjects: objectIds.map((informationObjectId) => ({ informationObjectId, position: 1 }))
            }
        }
    );
}

// A resource was removed: removes its components and endpoints, and the relations of all its fields and objects,
// whether the resource was the source or the target. External elements that received information from the resource
// get their received lists updated.
export async function removeResourceRelations(user: UserJwtPayload, resourceIds: string[]) {
    if(!resourceIds.length) return;

    // The components of the resources go with them, and scripts no longer read from or write to them
    await removeResourceComponents(user, resourceIds);
    await removeComponentEndReferences(user, resourceIds);

    // An endpoint is part of its resource and goes with it
    await Endpoint.deleteMany({ environmentId: user.environmentId, resourceId: { $in: resourceIds } });

    // So are its connections
    await deletePartConnections(user, resourceIds);

    const touchingResources = {
        environmentId: user.environmentId,
        $or: [
            { sourceResourceId: { $in: resourceIds } },
            { targetResourceId: { $in: resourceIds } }
        ]
    };

    const receivingExternalIds = new Set<string>([
        ...(await ResourceFieldRelation.distinct('targetResourceId', { ...touchingResources, targetResourceType: 'external' })),
        ...(await ResourceObjectRelation.distinct('targetResourceId', { ...touchingResources, targetResourceType: 'external' }))
    ].map((id) => id.toString()));

    await ResourceFieldRelation.deleteMany(touchingResources);
    await ResourceObjectRelation.deleteMany(touchingResources);

    // Information that had one of the resources as its source has no source anymore
    const sourcedHere = { environmentId: user.environmentId, 'source.resourceId': { $in: resourceIds } };
    await InformationField.updateMany(sourcedHere, { $set: { source: null } });
    await InformationObject.updateMany(sourcedHere, { $set: { source: null } });

    for(const externalId of receivingExternalIds) {
        if(!resourceIds.includes(externalId)) {
            await updateReceivedInformation(user, externalId);
        }
    }
}
