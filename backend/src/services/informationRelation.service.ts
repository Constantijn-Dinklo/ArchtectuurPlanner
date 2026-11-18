import { UserJwtPayload } from "../middelware";
import Application from "../models/resources/application.model";
import ResourceFieldRelation from "../models/information/resourceFieldRelation.model";
import ResourceObjectRelation from "../models/information/resourceObjectRelation.model";
import { getResourceType, updateReceivedInformation } from "./externalRelation.service";
import { addTableInformation } from "./table.service";
import { deleteApplicationInputInformationField, deleteApplicationInputInformationObject } from "./application.service";
import { connectParts, deleteConnection, getCarryingConnections, getConnection, getHolderIds } from "./connection.service";

// Every relation is one piece of information moving from a source to a target, through a connection whose ends hold
// the ends of the relation: the same part, or the database of a table. Two exceptions:
// - inside one resource (from its input to its output) there is no connection
// - through a script, until scripts are connection ends themselves: the relation names the script instead
//
// Relations added by hand, from what a resource receives from or sends to another resource, also give the receiver
// what it receives:
// - an application takes it in as an input
// - a table gets a column for it; a table only has fields, so an object gives a column for each of its fields
// - an external element receives it (its received lists follow from the relations to it)
// - a file location gets nothing: its information is in its files, and relations do not reach files yet
// When the last relation that brings information into an application is removed, the input goes as well.
// Columns of a table stay: a table keeps what was stored in it.

type Kind = 'field' | 'object';
type User = Pick<UserJwtPayload, 'environmentId'>;

const END_TYPES = ['application', 'table', 'external', 'fileLocation'];

export interface RelationToCreate {
    kind: Kind;
    informationId: string;
    sourceResourceId: string;
    targetResourceId: string;
    connectionId?: string | null;
    scriptId?: string | null;
}

function getModel(kind: Kind) {
    return (kind === 'field' ? ResourceFieldRelation : ResourceObjectRelation) as typeof ResourceFieldRelation;
}

function getIdKey(kind: Kind) {
    return kind === 'field' ? 'informationFieldId' : 'informationObjectId';
}

// The connection has to exist and its ends have to hold the ends of the relation
export async function checkRelationConnection(user: User, sourceId: string, targetId: string, connectionId: string) {
    const connection = await getConnection(user, connectionId);
    if(!connection) throw new Error("The connection of the relation does not exist");
    if(connection.kind === 'undecided') throw new Error("Choose how the information goes first");
    if(!(await getHolderIds(user, sourceId)).includes(connection.source.id) || !(await getHolderIds(user, targetId)).includes(connection.target.id)) {
        throw new Error("The connection does not go from the source to the target of the relation");
    }
}

// Creates the relation, unless the same one already exists. Every relation is made here
export async function createRelation(user: User, relation: RelationToCreate) {
    const isInside = relation.sourceResourceId === relation.targetResourceId;
    const connectionId = isInside ? null : relation.connectionId ?? null;
    const scriptId = isInside ? null : relation.scriptId ?? null;
    if(!isInside && !connectionId === !scriptId) throw new Error("A relation goes through one connection");
    if(connectionId) await checkRelationConnection(user, relation.sourceResourceId, relation.targetResourceId, connectionId);

    const sourceType = await getResourceType(user as UserJwtPayload, relation.sourceResourceId);
    const targetType = await getResourceType(user as UserJwtPayload, relation.targetResourceId);
    if(!sourceType || !END_TYPES.includes(sourceType)) throw new Error("Unknown source");
    if(!targetType || !END_TYPES.includes(targetType)) throw new Error("Unknown target");

    const fields = {
        environmentId: user.environmentId,
        [getIdKey(relation.kind)]: relation.informationId,
        sourceResourceId: relation.sourceResourceId,
        sourceResourceType: sourceType,
        targetResourceId: relation.targetResourceId,
        targetResourceType: targetType,
        connectionId,
        scriptId
    };
    const Model = getModel(relation.kind);
    return { relation: await Model.findOne(fields) ?? await Model.create(fields), targetType };
}

// Information one resource receives from another, added by hand. Without a chosen connection it goes through a
// connection between the two, made when there is none. With several, it can be moved to another one afterwards
export async function addInformationRelation(user: UserJwtPayload, relation: RelationToCreate) {
    if(relation.sourceResourceId === relation.targetResourceId) throw new Error("A resource cannot receive from itself");

    let connectionId = relation.connectionId ?? null;
    if(!connectionId) {
        const connection = (await getCarryingConnections(user, relation.sourceResourceId, relation.targetResourceId))
            .find((candidate) => candidate.kind !== 'undecided');
        connectionId = connection?.id ?? (await connectParts(user, relation.sourceResourceId, relation.targetResourceId)).id;
    }

    const created = await createRelation(user, { ...relation, connectionId, scriptId: null });
    await addToReceiver(user, relation.targetResourceId, created.targetType, relation.kind, relation.informationId);
    return created.relation;
}

// Moves the relation to another connection between the same two
export async function setRelationConnection(user: User, kind: Kind, relationId: string, connectionId: string) {
    const Model = getModel(kind);
    const relation = await Model.findOne({ _id: relationId, environmentId: user.environmentId });
    if(!relation) return undefined;
    if(relation.scriptId) throw new Error("This relation comes from a script: change what the script reads or writes instead");

    await checkRelationConnection(user, relation.sourceResourceId.toString(), relation.targetResourceId.toString(), connectionId);
    relation.connectionId = connectionId as any;
    await relation.save();
    return relation;
}

// The receiver has what it receives. An input of an application that was made there counts as received from now on
async function addToReceiver(user: UserJwtPayload, resourceId: string, type: string, kind: Kind, informationId: string) {
    if(type === 'application') {
        const list = kind === 'field' ? 'inputInformationFields' : 'inputInformationObjects';
        const idKey = getIdKey(kind);
        const updated = await Application.updateOne(
            { _id: resourceId, environmentId: user.environmentId, [`${list}.${idKey}`]: informationId },
            { $set: { [`${list}.$.position`]: 1 } }
        );
        if(!updated.matchedCount) {
            await Application.updateOne(
                { _id: resourceId, environmentId: user.environmentId },
                { $push: { [list]: { [idKey]: informationId, position: 1 } } }
            );
        }
    }
    if(type === 'table') await addTableInformation(user, resourceId, kind, informationId);
    if(type === 'external') await updateReceivedInformation(user, resourceId);
}

export async function removeInformationRelation(user: UserJwtPayload, kind: Kind, relationId: string) {
    const Model = getModel(kind);
    const relation = await Model.findOne({ _id: relationId, environmentId: user.environmentId });
    if(!relation) return { status: 404, message: "Relation not found" };
    if(relation.scriptId) {
        return { status: 409, message: "This relation comes from a script: change what the script reads or writes instead" };
    }
    await relation.deleteOne();

    const targetId = relation.targetResourceId.toString();
    const informationId = (kind === 'field'
        ? (relation as any).informationFieldId
        : (relation as any).informationObjectId).toString();

    if(relation.targetResourceType === 'application') {
        // Still received from another resource: the input stays
        const stillReceived = await Model.exists({
            environmentId: user.environmentId,
            [getIdKey(kind)]: informationId,
            targetResourceId: targetId,
            sourceResourceId: { $ne: targetId }
        });
        if(!stillReceived) {
            if(kind === 'field') await deleteApplicationInputInformationField(user, targetId, informationId);
            else await deleteApplicationInputInformationObject(user, targetId, informationId);
        }
    }
    if(relation.targetResourceType === 'external') await updateReceivedInformation(user, targetId);

    return { status: 200, message: "Relation removed" };
}

// A connection goes with everything that goes through it
export async function deleteConnectionWithRelations(user: UserJwtPayload, connectionId: string) {
    for(const kind of ['field', 'object'] as const) {
        const relations = await getModel(kind).find({ environmentId: user.environmentId, connectionId });
        for(const relation of relations) await removeInformationRelation(user, kind, relation._id.toString());
    }
    return deleteConnection(user, connectionId);
}
