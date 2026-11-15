import { UserJwtPayload } from "../middelware";
import Application from "../models/resources/application.model";
import ResourceFieldRelation from "../models/information/resourceFieldRelation.model";
import ResourceObjectRelation from "../models/information/resourceObjectRelation.model";
import { getResourceType, updateReceivedInformation } from "./externalRelation.service";
import { addTableInformation } from "./table.service";
import { deleteApplicationInputInformationField, deleteApplicationInputInformationObject } from "./application.service";

// Relations added and removed by hand, from what a resource receives from or sends to another resource.
// The receiver always has what it receives:
// - an application takes it in as an input
// - a table gets a column for it; a table only has fields, so an object gives a column for each of its fields
// - an external element receives it (its received lists follow from the relations to it)
// - a file location gets nothing: its information is in its files, and relations do not reach files
// When the last relation that brings information into an application is removed, the input goes as well.
// Columns of a table stay: a table keeps what was stored in it.
//
// Relations via a script are kept by syncScriptRelations, so they cannot be added or removed here.

type Kind = 'field' | 'object';
type ViaType = 'api' | 'database' | 'other';

const VIA_TYPES: ViaType[] = ['api', 'database', 'other'];
const END_TYPES = ['application', 'table', 'external', 'fileLocation'];

export interface RelationToAdd {
    kind: Kind;
    informationId: string;
    sourceResourceId: string;
    targetResourceId: string;
    viaConnectionType?: ViaType | null;
    viaConnectionId?: string | null;
}

function getModel(kind: Kind) {
    return (kind === 'field' ? ResourceFieldRelation : ResourceObjectRelation) as typeof ResourceFieldRelation;
}

function getIdKey(kind: Kind) {
    return kind === 'field' ? 'informationFieldId' : 'informationObjectId';
}

export async function addInformationRelation(user: UserJwtPayload, relation: RelationToAdd) {
    const viaConnectionType = relation.viaConnectionType ?? null;
    if(viaConnectionType !== null && !VIA_TYPES.includes(viaConnectionType)) throw new Error("Unknown connection type");
    if(relation.sourceResourceId === relation.targetResourceId) throw new Error("A resource cannot receive from itself");

    const sourceType = await getResourceType(user, relation.sourceResourceId);
    const targetType = await getResourceType(user, relation.targetResourceId);
    if(!sourceType || !END_TYPES.includes(sourceType)) throw new Error("Unknown source");
    if(!targetType || !END_TYPES.includes(targetType)) throw new Error("Unknown target");

    const fields = {
        environmentId: user.environmentId,
        [getIdKey(relation.kind)]: relation.informationId,
        sourceResourceId: relation.sourceResourceId,
        sourceResourceType: sourceType,
        targetResourceId: relation.targetResourceId,
        targetResourceType: targetType,
        viaConnectionType,
        viaConnectionId: viaConnectionType ? relation.viaConnectionId ?? null : null
    };
    const Model = getModel(relation.kind);
    const created = await Model.findOne(fields) ?? await Model.create(fields);

    await addToReceiver(user, relation.targetResourceId, targetType, relation.kind, relation.informationId);
    return created;
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
    if(relation.viaConnectionType === 'component') {
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
