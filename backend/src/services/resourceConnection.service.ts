import { UserJwtPayload } from "../middelware";
import Api from "../models/api.model";
import ApiConnection from "../models/apiConnection.model";
import DatabaseConnection from "../models/databaseConnection.model";
import OtherConnection from "../models/otherConnection.model";
import Table from "../models/resources/table.model";
import ResourceFieldRelation from "../models/information/resourceFieldRelation.model";
import ResourceObjectRelation from "../models/information/resourceObjectRelation.model";
import { getResourceType } from "./externalRelation.service";
import { deleteOtherConnection } from "./otherConnection.service";
import { removeInformationRelation } from "./informationRelation.service";

// Connecting two resources, whatever kind of connection that takes:
// - a database (or a table of it) and another resource: a database connection, reading when the database is the
//   source and writing when it is the target
// - any other two resources: an api connection or an other connection. When there is none yet, an other connection
//   is made, with an unknown method (or a file, for a file location)

type Operation = 'read' | 'write';

// The database connection two resources would have: the database, the other resource and the operation
async function getDatabaseLink(user: UserJwtPayload, sourceId: string, targetId: string) {
    const sourceDatabaseId = await getDatabaseId(user, sourceId);
    const targetDatabaseId = await getDatabaseId(user, targetId);
    if(sourceDatabaseId && targetDatabaseId) throw new Error("Two databases cannot be connected directly");
    if(sourceDatabaseId) return { databaseId: sourceDatabaseId, entityId: targetId, operation: 'read' as Operation };
    if(targetDatabaseId) return { databaseId: targetDatabaseId, entityId: sourceId, operation: 'write' as Operation };
    return undefined;
}

// The database itself, or the database of a table
async function getDatabaseId(user: UserJwtPayload, resourceId: string) {
    const type = await getResourceType(user, resourceId);
    if(type === 'database') return resourceId;
    if(type === 'table') return (await Table.findOne({ _id: resourceId, environmentId: user.environmentId }))?.databaseId.toString();
    return undefined;
}

// Api connections from the source to the target. Their source is their own, or the owner of their api
async function getApiConnections(user: UserJwtPayload, sourceId: string, targetId: string) {
    const connections = await ApiConnection.find({ environmentId: user.environmentId, targetId });
    const apis = await Api.find({ environmentId: user.environmentId, _id: { $in: connections.map((connection) => connection.sourceUrlId) } });
    return connections.filter((connection) => {
        const apiOwnerId = apis.find((api) => api._id.toString() === connection.sourceUrlId?.toString())?.applicationId?.toString();
        return (connection.sourceId?.toString() ?? apiOwnerId) === sourceId;
    });
}

export async function getOtherConnection(user: UserJwtPayload, sourceId: string, targetId: string) {
    return OtherConnection.findOne({ environmentId: user.environmentId, sourceId, targetId });
}

export async function connectResources(user: UserJwtPayload, sourceId: string, targetId: string) {
    if(sourceId === targetId) throw new Error("A resource cannot be connected to itself");

    const databaseLink = await getDatabaseLink(user, sourceId, targetId);
    if(databaseLink) {
        await DatabaseConnection.updateOne(
            { environmentId: user.environmentId, databaseId: databaseLink.databaseId, entityId: databaseLink.entityId },
            { $addToSet: { operation: databaseLink.operation } },
            { upsert: true }
        );
        return;
    }

    if(await getOtherConnection(user, sourceId, targetId)) return;
    if((await getApiConnections(user, sourceId, targetId)).length) return;

    const isFile = [await getResourceType(user, sourceId), await getResourceType(user, targetId)].includes('fileLocation');
    await OtherConnection.create({
        environmentId: user.environmentId,
        sourceId,
        targetId,
        method: isFile ? 'file' : 'unknown'
    });
}

// Removes everything from the source to the target: the relations (not those via a script), the read or write of the
// database connection, and the api and other connections
export async function disconnectResources(user: UserJwtPayload, sourceId: string, targetId: string) {
    // A database is connected through its tables as well
    const withTables = async (resourceId: string) => [
        resourceId,
        ...(await Table.find({ environmentId: user.environmentId, databaseId: resourceId })).map((table) => table._id.toString())
    ];
    const ends = {
        environmentId: user.environmentId,
        sourceResourceId: { $in: await withTables(sourceId) },
        targetResourceId: { $in: await withTables(targetId) },
        viaConnectionType: { $ne: 'component' as const }
    };
    for(const relation of await ResourceFieldRelation.find(ends)) await removeInformationRelation(user, 'field', relation._id.toString());
    for(const relation of await ResourceObjectRelation.find(ends)) await removeInformationRelation(user, 'object', relation._id.toString());

    const databaseLink = await getDatabaseLink(user, sourceId, targetId);
    if(databaseLink) {
        const filter = { environmentId: user.environmentId, databaseId: databaseLink.databaseId, entityId: databaseLink.entityId };
        await DatabaseConnection.updateOne(filter, { $pull: { operation: databaseLink.operation } });
        await DatabaseConnection.deleteOne({ ...filter, operation: { $size: 0 } });
        return;
    }

    const apiConnectionIds = (await getApiConnections(user, sourceId, targetId)).map((connection) => connection._id);
    await ApiConnection.deleteMany({ _id: { $in: apiConnectionIds } });
    const otherConnection = await getOtherConnection(user, sourceId, targetId);
    if(otherConnection) await deleteOtherConnection(user, otherConnection._id.toString());
}
